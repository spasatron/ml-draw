""" Testing some Neural Network Trainings Stuff"""
import matplotlib.pyplot as plt
import tensorflow_datasets as tfds
import tensorflow as tf
import os

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'


tf.config.run_functions_eagerly(False)


if __name__ == '__main__':

    print("Num GPUs Available: ", len(tf.config.list_physical_devices('GPU')))
    buffer_size = 8_000_000
    ds, info = tfds.load('quickdraw_bitmap',
                         split=f'train[:{buffer_size}]', with_info=True, data_dir=os.path.join('./binary_images'))

    image_count = info.splits['train'].num_examples
    batch_size = 16

    train_size = int(0.8*buffer_size)

    assert isinstance(ds, tf.data.Dataset)

    ds = ds.shuffle(buffer_size, reshuffle_each_iteration=False)
    train_ds = ds.take(train_size)
    val_ds = ds.skip(train_size)

    num_classes = info.features['label'].num_classes

    def preprocess_data(record):
        image = record['image']
        label = record['label']
        return image, label

    train_ds = train_ds.map(preprocess_data).batch(batch_size)
    val_ds = val_ds.map(preprocess_data).batch(batch_size)

    AUTOTUNE = tf.data.AUTOTUNE

    train_ds = train_ds.cache().prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)

    data_augmentation = tf.keras.Sequential(
        [
            tf.keras.layers.RandomFlip("horizontal",
                                       input_shape=(28,
                                                    28,
                                                    1)),
            tf.keras.layers.RandomRotation(0.1),
            tf.keras.layers.RandomZoom(0.1),
        ]
    )

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
        tf.keras.layers.Dense(num_classes)
    ])

    model.compile(
        optimizer='adam',
        loss=tf.keras.losses.SparseCategoricalCrossentropy(
            from_logits=True),
        metrics=['accuracy'])
    model.summary()
    epochs = 10

    history = model.fit(

        train_ds,
        validation_data=val_ds,
        epochs=epochs,
        verbose=1,
    )

    acc = history.history['accuracy']
    val_acc = history.history['val_accuracy']

    loss = history.history['loss']
    val_loss = history.history['val_loss']

    epochs_range = range(epochs)

    plt.figure(figsize=(8, 8))
    plt.subplot(1, 2, 1)
    plt.plot(epochs_range, acc, label='Training Accuracy')
    plt.plot(epochs_range, val_acc, label='Validation Accuracy')
    plt.legend(loc='lower right')
    plt.title('Training and Validation Accuracy')

    plt.subplot(1, 2, 2)
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
