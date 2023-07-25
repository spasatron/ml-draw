""" Trains a neraul netword on a set of images located in .bin and save the tensorflow model"""
import os
import struct
from struct import unpack
import traceback
import logging


import numpy as np
import cairocffi as cairo
import tensorflow as tf
# pylint: disable-next=import-error
from tensorflow.keras.callbacks import ModelCheckpoint
import matplotlib.pyplot as plt
from inception_module import InceptionModule
from PIL import Image


BIN_DIR_FILE_LOC = "./binary_images"
NUM_CLASSES = 121
EPOCHS = 20
INDIVIDUAL_EXAMPLE_SIZE = 15_000
VALIDATION_PERCENT = .1
BATCH_SIZE = 64
LABEL_MAPPING = {}
L = logging.getLogger(__name__)
## ------ Helper Functions ------- ##

VALIDATION_SIZE = int(VALIDATION_PERCENT*NUM_CLASSES*INDIVIDUAL_EXAMPLE_SIZE)


def unpack_drawing(file_handle):
    """ Helper function of unpack_drawings"""
    key_id, = unpack('Q', file_handle.read(8))
    country_code, = unpack('2s', file_handle.read(2))
    recognized, = unpack('b', file_handle.read(1))
    timestamp, = unpack('I', file_handle.read(4))
    n_strokes, = unpack('H', file_handle.read(2))
    image = []
    for _ in range(n_strokes):
        n_points, = unpack('H', file_handle.read(2))
        fmt = str(n_points) + 'B'
        x = unpack(fmt, file_handle.read(n_points))
        y = unpack(fmt, file_handle.read(n_points))
        image.append((x, y))

    return {
        'key_id': key_id,
        'country_code': country_code,
        'recognized': recognized,
        'timestamp': timestamp,
        'image': image
    }


def extract_label_from_filename(filename):
    """ Returns the filename mapped to a label"""
    label = os.path.splitext(os.path.basename(filename))[0]
    return LABEL_MAPPING.get(label, -1)


def unpack_drawings(filename):
    """ Takes in .bin file and returns simplified representation of image in a dictionary"""

    label = extract_label_from_filename(str(filename))
    with open(filename, 'rb') as file_handle:
        num_img = 0
        while True and (num_img < INDIVIDUAL_EXAMPLE_SIZE):
            try:
                drawing = unpack_drawing(file_handle)

                image = drawing['image']

                raster = vector_to_raster([image])

                img_data = np.reshape(raster[0], (64, 64))

                # img = Image.fromarray(img_data, 'L')
                # img.save(f"{label}.png")
                if drawing['recognized']:
                    yield (img_data, label)
                    num_img += 1
            except struct.error:
                break
            # pylint: disable-next=broad-except
            except Exception:
                print("Other Error", traceback.format_exc())

                break
        # print(f"End of File {filename} with {num_img} uses")
        return


def vector_to_raster(vector_images, side=64, line_diameter=12, padding=26, bg_color=(0, 0, 0), fg_color=(1, 1, 1)):
    """ Padding and line_diameter are relative to the original 256x256 image."""

    original_side = 256.

    surface = cairo.ImageSurface(cairo.FORMAT_ARGB32, side, side)
    ctx = cairo.Context(surface)
    ctx.set_antialias(cairo.ANTIALIAS_BEST)
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    ctx.set_line_join(cairo.LINE_JOIN_ROUND)
    ctx.set_line_width(line_diameter)

    # scale to match the new size
    # add padding at the edges for the line_diameter
    # and add additional padding to account for antialiasing
    total_padding = padding * 2. + line_diameter
    new_scale = float(side) / float(original_side + total_padding)
    ctx.scale(new_scale, new_scale)
    ctx.translate(total_padding / 2., total_padding / 2.)

    raster_images = []
    for vector_image in vector_images:
        # clear background
        ctx.set_source_rgb(*bg_color)
        ctx.paint()

        bbox = np.hstack(vector_image).max(axis=1)
        offset = ((original_side, original_side) - bbox) / 2.
        offset = offset.reshape(-1, 1)
        centered = [stroke + offset for stroke in vector_image]

        # draw strokes, this is the most cpu-intensive part
        ctx.set_source_rgb(*fg_color)
        # pylint: disable-next=invalid-name
        for xv, yv in centered:
            ctx.move_to(xv[0], yv[0])
            for x, y in zip(xv, yv):
                ctx.line_to(x, y)
            ctx.stroke()

        data = surface.get_data()
        raster_image = np.copy(np.asarray(data)[::4])
        raster_images.append(raster_image)

    return raster_images


def parse_bin_file(filename):
    """ Returns List of TensorFlow Examples from one .bin image file"""
    examples = []
    label = extract_label_from_filename(filename)
    for drawing in unpack_drawings(filename):
        # do something with the drawing
        # print(drawing['image'])
        image = drawing['image']

        raster = vector_to_raster([image])

        img_data = np.reshape(raster[0], (64, 64))

        # img = Image.fromarray(img_data, 'L')
        # img.save('my.png')

        examples.append((img_data, label))
    return examples


def create_tf_dataset(files, num_classes, shuffle_buffer_size=100_000, seed=42, batch_size=64, validation_size=100_000):
    """ Create Function Method"""
    filepath_dataset = tf.data.Dataset.list_files(files, seed=seed)

    dataset = filepath_dataset.interleave(
        lambda filepath: tf.data.Dataset.from_generator(
            unpack_drawings, args=(filepath, ),
            output_signature=(
                tf.TensorSpec(shape=(64, 64), dtype=tf.uint8),
                tf.TensorSpec(shape=(), dtype=tf.int64)
            )
        ),
        cycle_length=num_classes,
        num_parallel_calls=tf.data.AUTOTUNE
    )

    v_data = dataset.take(validation_size)

    dataset = dataset.skip(validation_size).shuffle(
        shuffle_buffer_size, seed=seed)

    return dataset.batch(batch_size).prefetch(1), v_data.batch(batch_size).cache()


if __name__ == "__main__":

    logging.basicConfig(level=logging.INFO)

    bin_files = [os.path.join(BIN_DIR_FILE_LOC, file) for file in os.listdir(
        BIN_DIR_FILE_LOC) if file.endswith('.bin')]
    LABEL_MAPPING = dict(zip([os.path.splitext(
        os.path.basename(filename))[0] for filename in bin_files], range(NUM_CLASSES)))

    # Shuffle the dataset - Each bin file contains around 150,000 images with around 35 times
    train_dataset, validation_dataset = create_tf_dataset(
        bin_files, NUM_CLASSES, shuffle_buffer_size=int(NUM_CLASSES*INDIVIDUAL_EXAMPLE_SIZE) + 1, batch_size=BATCH_SIZE, validation_size=VALIDATION_SIZE)

    data_augmentation = tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip(
                "horizontal",
                input_shape=(64, 64, 1)
            ),
            tf.keras.layers.RandomRotation(0.05),
            # tf.keras.layers.RandomZoom(0.1),
        ]
    )

    model = tf.keras.Sequential([
        tf.keras.layers.Rescaling(1./255, input_shape=(64, 64, 1)),
        data_augmentation,
        tf.keras.layers.Conv2D(128, 5, padding='same'),
        tf.keras.layers.MaxPooling2D(),
        InceptionModule(256, 128, 64, 32, 16, 16),
        tf.keras.layers.MaxPooling2D(),
        InceptionModule(512, 256, 128, 64, 32, 32),
        tf.keras.layers.MaxPooling2D(),
        InceptionModule(1024, 512, 256, 128, 64, 64),
        tf.keras.layers.MaxPooling2D(),
        InceptionModule(2048, 1024, 512, 256, 128, 128),
        tf.keras.layers.GlobalAveragePooling2D(),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dropout(.4),
        tf.keras.layers.Dense(NUM_CLASSES)
    ])

    model.compile(
        optimizer='adam',
        loss=tf.keras.losses.SparseCategoricalCrossentropy(
            from_logits=True),
        metrics=['accuracy'])
    model.summary()

    CHECKPOINT_PATH = ".inception/inception_{epoch}.h5"

    checkpoint_callback = ModelCheckpoint(
        filepath=CHECKPOINT_PATH,
        save_freq='epoch',  # Save after each epoch
        save_best_only=False,  # Save the model each time, even if not the best
        verbose=1  # Provide a verbose output
    )

    HISTORY = model.fit(
        train_dataset,
        validation_data=validation_dataset,
        epochs=EPOCHS,
        verbose=1,
        callbacks=[checkpoint_callback]
    )

    acc = HISTORY.history['accuracy']
    val_acc = HISTORY.history['val_accuracy']

    loss = HISTORY.history['loss']
    val_loss = HISTORY.history['val_loss']

    epochs_range = range(EPOCHS)

    plt.figure(figsize=(8, 8))
    plt.subplot(2, 1, 1)
    plt.plot(epochs_range, acc, label='Training Accuracy')
    plt.plot(epochs_range, val_acc, label='Validation Accuracy')
    plt.legend(loc='lower right')
    plt.title('Training and Validation Accuracy')

    plt.subplot(2, 1, 2)
    plt.plot(epochs_range, loss, label='Training Loss')
    plt.plot(epochs_range, val_loss, label='Validation Loss')
    plt.legend(loc='upper right')
    plt.title('Training and Validation Loss (Inception)')
    plt.savefig('incepetion.png', dpi=400)
    # Save Model
    model.save('inception_done.keras')

    # Convert the model.
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()

    # Save the model.
    with open('model.tflite', 'wb') as f:
        f.write(tflite_model)
