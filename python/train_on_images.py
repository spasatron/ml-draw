""" Trains a neraul netword on a set of images located in .bin and save the tensorflow model"""
import os
import struct
from struct import unpack

import numpy as np
import cairocffi as cairo
import tensorflow as tf
from tensorflow.keras.callbacks import ModelCheckpoint
import matplotlib.pyplot as plt


BIN_DIR_FILE_LOC = "./binary_images"
NUM_CLASSES = 28
EPOCHS = 10
EPOCH_DATA_SIZE = 500_000


## ------ Helper Functions ------- ##


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


def unpack_drawings(filename):
    """ Takes in .bin file and returns simplified representation of image in a dictionary"""
    with open(filename, 'rb') as file_handle:
        while True:
            try:
                yield unpack_drawing(file_handle)
            except struct.error:
                break


def vector_to_raster(vector_images, side=28, line_diameter=16, padding=16, bg_color=(0, 0, 0), fg_color=(1, 1, 1)):
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


def extract_label_from_filename(filename):
    """ Returns the filename mapped to a label"""
    label = os.path.splitext(os.path.basename(filename))[0]

    label_mapping = {'airplane': 0, 'apple': 1, 'axe': 2, 'backpack': 3, 'banana': 4, 'bee': 5,
                     'bicycle': 6, 'car': 7, 'chair': 8, 'crown': 9, 'donut': 10,
                     'duck': 11, 'elephant': 12, 'eye': 13, 'feather': 14, 'flower': 15,
                     'guitar': 16, 'hamburger': 17, 'knife': 18, 'mushroom': 19, 'octopus': 20,
                     'pants': 21, 'rainbow': 22, 'shark': 23, 'snake': 24, 'sun': 25,
                     'television': 26, 'tree': 27}
    return label_mapping.get(label, -1)






def parse_bin_file(filename):
    """ Returns List of TensorFlow Examples from one .bin image file"""
    examples = []
    label = extract_label_from_filename(filename)
    for drawing in unpack_drawings(filename):
        # do something with the drawing
        # print(drawing['image'])
        image = drawing['image']

        raster = vector_to_raster([image])

        img_data = np.reshape(raster[0], (28, 28))
        examples.append((img_data, label))
    return examples


if __name__ == "__main__":

    bin_files = [os.path.join(BIN_DIR_FILE_LOC, file) for file in os.listdir(
        BIN_DIR_FILE_LOC) if file.endswith('.bin')]

    dataset = tf.data.Dataset.from_generator(
        lambda: (example for file in bin_files for example in parse_bin_file(file)),
        output_signature=(
            tf.TensorSpec(shape=(28, 28), dtype=tf.uint8),
            tf.TensorSpec(shape=(), dtype=tf.int64)
        )
    )

    # Shuffle the dataset - Each bin file contains around 150,000 images with around 35 times
    shuffled_dataset = dataset.shuffle(buffer_size=150_000*35, reshuffle_each_iteration=True)


    random_sample = shuffled_dataset.take(EPOCH_DATA_SIZE)

    # shuffled_dataset = shuffled_dataset.batch(64, drop_remainder=True)

    VALIDATION_SIZE = int(.2 * EPOCH_DATA_SIZE)

    train_dataset = random_sample.skip(VALIDATION_SIZE)
    validation_dataset = random_sample.take(VALIDATION_SIZE)

    train_dataset = train_dataset.batch(64, drop_remainder=True)
    validation_dataset = validation_dataset.batch(64, drop_remainder=True)

    model = tf.keras.Sequential([
        # data_augmentation,
        tf.keras.layers.Rescaling(1./255, input_shape=(28, 28, 1)),
        tf.keras.layers.Conv2D(28, 2, padding='same', activation='relu'),
        tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Conv2D(14, 2, padding='same', activation='relu'),
        tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Conv2D(10, 2, padding='same', activation='relu'),
        # tf.keras.layers.MaxPooling2D(),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dense(384, activation='relu'),
        tf.keras.layers.Dense(NUM_CLASSES)
    ])

    model.compile(
        optimizer='adam',
        loss=tf.keras.losses.SparseCategoricalCrossentropy(
            from_logits=True),
        metrics=['accuracy'])
    model.summary()





    CHECKPOINT_PATH = "./model_{epoch}.h5"

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
    plt.title('Training and Validation Loss')
    plt.savefig('model_train.png', dpi=400)
    # Convert the model.
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()

    # Save the model.
    with open('model.tflite', 'wb') as f:
        f.write(tflite_model)
