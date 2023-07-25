from tensorflow.keras.layers import Layer, Conv2D, MaxPooling2D, Concatenate


class InceptionModule(Layer):
    """Inception Module"""

    def __init__(self, filters_1x1, filters_3x3_reduce, filters_3x3, filters_5x5_reduce, filters_5x5, filters_pool_proj, **kwargs):
        super(InceptionModule, self).__init__(**kwargs)

        # Define individual layers for each branch
        self.conv1x1 = Conv2D(
            filters_1x1, (1, 1), activation='relu', kernel_initializer='he_normal')

        self.conv3x3_reduce = Conv2D(
            filters_3x3_reduce, (1, 1), activation='relu', kernel_initializer='he_normal')
        self.conv3x3 = Conv2D(filters_3x3, (3, 3), padding='same',
                              activation='relu', kernel_initializer='he_normal')

        self.conv5x5_reduce = Conv2D(
            filters_5x5_reduce, (1, 1), activation='relu', kernel_initializer='he_normal')
        self.conv5x5 = Conv2D(filters_5x5, (5, 5), padding='same',
                              activation='relu', kernel_initializer='he_normal')

        self.pool_proj = Conv2D(filters_pool_proj, (1, 1),
                                activation='relu', kernel_initializer='he_normal')

    def call(self, inputs):
        conv1x1 = self.conv1x1(inputs)

        conv3x3_reduce = self.conv3x3_reduce(inputs)
        conv3x3 = self.conv3x3(conv3x3_reduce)

        conv5x5_reduce = self.conv5x5_reduce(inputs)
        conv5x5 = self.conv5x5(conv5x5_reduce)

        pool_proj = MaxPooling2D(
            (3, 3), strides=(1, 1), padding='same')(inputs)
        pool_proj = self.pool_proj(pool_proj)

        # Concatenate the outputs from each branch
        inception_output = Concatenate(
            axis=-1)([conv1x1, conv3x3, conv5x5, pool_proj])

        return inception_output

    def get_config(self):
        config = super(InceptionModule, self).get_config()
        config.update({
            'filters_1x1': self.conv1x1.filters,
            'filters_3x3_reduce': self.conv3x3_reduce.filters,
            'filters_3x3': self.conv3x3.filters,
            'filters_5x5_reduce': self.conv5x5_reduce.filters,
            'filters_5x5': self.conv5x5.filters,
            'filters_pool_proj': self.pool_proj.filters,
        })
        return config
