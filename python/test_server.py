from typing import Union

import numpy as np
from numpy import array
from fastapi import FastAPI

app = FastAPI()




def convert_bytes_to_uint8_array(data_bytes: str) -> array:
    print(str.encode(data_bytes))

        # Convert bytes to a NumPy array of uint8
    data_array = np.frombuffer(str.encode(data_bytes), dtype=np.uint8)
    
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
    return {"Hello": "World"}



@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}


@app.get("/input/{byte_data}")
def read_bytes(byte_data: str):
    # return Items(items=dict(enumerate(convert_bytes_to_uint8_array(byte_data).sum(axis=1))))

    bool_array = convert_bytes_to_uint8_array(byte_data);
    flattened_str = np.array2string(bool_array)


    return {"Data": flattened_str}