"""Test REST API Server for ML-Draw"""

import base64
import traceback
import sys
import uvicorn
import numpy as np
import tensorflow
from numpy import array
import inflect
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from inception_module import InceptionModule

np.set_printoptions(threshold=sys.maxsize, linewidth=250)

BIN_DIR_FILE_LOC = "./binary_images"
NUM_CLASSES = 121

LABEL_TO_NUM_MAP = {
    "airplane": 0,
    "alarm clock": 1,
    "apple": 2,
    "axe": 3,
    "backpack": 4,
    "banana": 5,
    "basket": 6,
    "beach": 7,
    "bee": 8,
    "bicycle": 9,
    "bird": 10,
    "book": 11,
    "bowtie": 12,
    "butterfly": 13,
    "cactus": 14,
    "cake": 15,
    "camera": 16,
    "campfire": 17,
    "candle": 18,
    "car": 19,
    "carrot": 20,
    "cat": 21,
    "cell phone": 22,
    "chair": 23,
    "circle": 24,
    "clock": 25,
    "cloud": 26,
    "compass": 27,
    "computer": 28,
    "cookie": 29,
    "cow": 30,
    "crab": 31,
    "crown": 32,
    "dog": 33,
    "donut": 34,
    "duck": 35,
    "elephant": 36,
    "envelope": 37,
    "eye": 38,
    "fan": 39,
    "feather": 40,
    "finger": 41,
    "fish": 42,
    "flashlight": 43,
    "flower": 44,
    "fork": 45,
    "frog": 46,
    "guitar": 47,
    "hamburger": 48,
    "hand": 49,
    "hat": 50,
    "helicopter": 51,
    "hourglass": 52,
    "house": 53,
    "ice cream": 54,
    "knife": 55,
    "leaf": 56,
    "light bulb": 57,
    "lightning": 58,
    "lipstick": 59,
    "lollipop": 60,
    "map": 61,
    "microphone": 62,
    "monkey": 63,
    "moon": 64,  # The
    "mountain": 65,
    "moustache": 66,
    "mouth": 67,
    "mushroom": 68,
    "octagon": 69,
    "octopus": 70,  # Non-Plural
    "owl": 71,
    "paintbrush": 72,
    "palm tree": 73,
    "pants": 74,
    "peanut": 75,
    "pear": 76,
    "peas": 77,
    "piano": 78,
    "pig": 79,
    "pillow": 80,
    "pineapple": 81,
    "popsicle": 82,
    "rainbow": 83,
    "scissors": 84,
    "shark": 85,
    "shoe": 86,
    "shovel": 87,
    "smiley face": 88,
    "snail": 89,
    "snake": 90,
    "snowflake": 91,
    "snowman": 92,
    "sock": 93,
    "spoon": 94,
    "stairs": 95,
    "star": 96,
    "stop sign": 97,
    "strawberry": 98,
    "submarine": 99,
    "sun": 100,  # The
    "sword": 101,
    "syringe": 102,
    "t-shirt": 103,
    "teddy-bear": 104,
    "television": 105,
    "tent": 106,
    "toilet": 107,
    "tooth": 108,
    "toothbrush": 109,
    "toothpaste": 110,
    "traffic light": 111,
    "tree": 112,
    "triangle": 113,
    "trombone": 114,
    "trumpet": 115,
    "umbrella": 116,
    "whale": 117,
    "wheel": 118,
    "wine bottle": 119,
    "wine glass": 120
}


def is_plural(word):
    """ Decides if word is plural or not"""
    p_engine = inflect.engine()
    singular_form = p_engine.singular_noun(word)
    print(singular_form, singular_form is not False)
    return singular_form is not False


model = tensorflow.keras.models.load_model('model.h5', custom_objects={
                                           "InceptionModule": InceptionModule})

model.summary()

app = FastAPI()


origins = [
    "http://localhost:5173",  # Add your frontend URL here
    "http://ml-draw.spasangelov.com"
]

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def convert_bytes_to_uint8_array(data_bytes: str) -> array:
    """Convert String Bytes into a np uint8 array of size 64 by 64"""

    decoded_bytes = base64.b64decode(data_bytes)

    # Create a new UInt8Array from the decoded bytes
    uint8_array = bytearray(decoded_bytes)

    # Convert bytes to a NumPy array of uint8
    data_array = np.frombuffer(uint8_array, dtype=np.uint8, count=512)

    # Convert each uint8 value to a binary representation
    binary_array = np.unpackbits(data_array)

    # Reshape the array into a 64x64 shape
    bool_array = np.reshape(binary_array, (64, 64))

    # Convert the binary values to boolean values
    bool_array = bool_array.astype(np.uint8)
    print(bool_array)

    return bool_array


@app.get('/')
def read_root():
    """Default for reat root"""
    return {"Hello": "World"}


@app.get("/categories")
def read_all_categories():

    return LABEL_TO_NUM_MAP


@app.get("/categories/{input_num}")
def read_specific_category(input_num: int):
    """ Returns correct format input based on input number"""
    inverse_map = {value: key for key, value in LABEL_TO_NUM_MAP.items()}
    proper_nouns_list = [64, 100]

    def isVowel(char):
        """ Check to see if char is vowel"""
        return char.lower() in 'aeiou'

    response_string = inverse_map.get(input_num, "Unknown")

    if response_string == "Unknown":
        return {"Response": response_string}

    if is_plural(response_string):
        return {"Response": "I think you are drawing " + response_string}

    if input_num in proper_nouns_list:
        return {"Response": "I think you are drawing the " + response_string[0].upper() + response_string[1:]}

    if isVowel(response_string[0]):

        return {"Response": "I think you are drawing an " + response_string}

    return {"Response": "I think you are drawing a " + response_string}


@app.post("/prediction/")
def read_prediction(payload: dict):
    """ Converts byte data into a prediction"""
    bool_array = convert_bytes_to_uint8_array(payload.get('binaryData'))
    print(bool_array)
    bool_tensor = tensorflow.reshape(
        tensorflow.convert_to_tensor(255*bool_array), [1, 64, 64, 1])

    try:
        output_array = np.exp(model.predict(bool_tensor))
        print(output_array, output_array.shape)
        input_num = np.argmax(output_array.flatten())
    # pylint: disable=bare-except
    except:
        traceback.print_exc()
        input_num = -1

    print(input_num)

    inverse_map = {value: key for key, value in LABEL_TO_NUM_MAP.items()}
    proper_nouns_list = [64, 100]

    def is_vowel(char):
        """ Check to see if char is vowel"""
        return char.lower() in 'aeiou'

    response_string = inverse_map.get(input_num, "Unknown")

    if response_string == "Unknown":
        return {"Response": response_string}

    if is_plural(response_string):
        return {"Response": "I think you are drawing " + response_string}

    if input_num in proper_nouns_list:
        return {"Response": "I think you are drawing the " + response_string[0].upper() + response_string[1:]}

    if is_vowel(response_string[0]):

        return {"Response": "I think you are drawing an " + response_string}

    return {"Response": "I think you are drawing a " + response_string}


@app.get("/input/{byte_data}")
def read_bytes(byte_data: str):
    """Input endpoint expecting a encoded Uint8Array data"""
    # return Items(items=dict(enumerate(convert_bytes_to_uint8_array(byte_data).sum(axis=1))))

    bool_array = convert_bytes_to_uint8_array(byte_data)
    flattened_str = np.array2string(bool_array)

    return {"Data": flattened_str}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=4000)
