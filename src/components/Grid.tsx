import React, { useState, useRef, useEffect } from "react";
import GridCell from "./GridCell";
import "./Grid.css";

import * as tf from "@tensorflow/tfjs";

const labelMapping: Record<number, string> = {
  0: "airplane",
  1: "apple",
  2: "axe",
  3: "backpack",
  4: "banana",
  5: "bee",
  6: "bicycle",
  7: "car",
  8: "chair",
  9: "crown",
  10: "donut",
  11: "duck",
  12: "elephant",
  13: "eye",
  14: "feather",
  15: "flower",
  16: "guitar",
  17: "hamburger",
  18: "knife",
  19: "mushroom",
  20: "octopus",
  21: "pants",
  22: "rainbow",
  23: "shark",
  24: "snake",
  25: "sun",
  26: "television",
  27: "tree",
};

let model: tf.LayersModel;

async function loadModel() {
  console.log("Loading model...");
  const modelPath = "assets/model.json";
  const modelLoad = await tf.loadLayersModel(modelPath);
  model = modelLoad;
  console.log("Model loaded successfully!");
}

const gridGapVH = .3;
const gridSizeVH = 1.2;


function vhToPixels(vh: number) : number {
  const height = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0
  );
  return Math.max(Math.floor((vh*height)/100), 1);
}


loadModel();

interface GridProps {
  onPredictionChange: (newPrediction: string) => void;
  gridState: any[][];
  onGridChange: (newGrid: any[][]) => void;
}

const Grid: React.FC<GridProps> = ({
  onPredictionChange,
  gridState,
  onGridChange,
}) => {
  const [predictedLabel, setPredictedLabel] = useState("");
  const [gridSize, setGridSize] = useState<number>(vhToPixels(gridSizeVH));
  
  const handleResize = () => {
    console.time('Handle Resize');
    setGridSize(vhToPixels(gridSizeVH));
    console.timeEnd('Handle Resize');
  };
 let brushSize = 3;

  const divRef = useRef<HTMLDivElement>(null);

  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleMouseDown = () => {
    console.log("Local Mouse Down");
    setIsMouseDown(true);
  };

  const handleMouseUp = () => {
    console.log("Local Mouse Up");
    setIsMouseDown(false);
  };

  function rotateN90(a: any[][]) {
    var temp = new Array(a[0].length); // number of columns
    var i = 0;

    for (i = 0; i < temp.length; i++) {
      temp[i] = [];
    }

    for (i = 0; i < a.length; i++) {
      for (let j = 0; j < a[0].length; j++) {
        temp[j][i] = a[i][a[i].length - 1 - j];
      }
    }

    return temp;
  }
  // Function to rotate a 2D array clockwise
  function rotateArrayClockwise(array: any[][]): any[][] {
    const numRows = array.length;
    const numCols = array[0].length;
    let rotatedArray = [];

    for (let col = numCols - 1; col >= 0; col--) {
      let newRow = [];
      for (let row = 0; row < numRows; row++) {
        newRow.push(array[row][col]);
      }
      rotatedArray.push(newRow);
    }

    return rotatedArray;
  }
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isMouseDown && divRef.current) {
        console.time('Mouse Move Detected')
        const { width, height, left, top } =
          divRef.current.getBoundingClientRect();
        const { clientX, clientY } = event;
        const cellWidth = width / gridState.length;
        //TODO change back to height once all components are rearanged
        const cellHeight = width / gridState[0].length;

        const brushRadius = Math.floor(brushSize / 2);

        const startGridX =
          Math.floor((clientX - left) / cellWidth) - brushRadius;
        const endGridX = startGridX + brushSize;
        const startGridY =
          Math.floor((clientY - top) / cellHeight) - brushRadius;
        const endGridY = startGridY + brushSize;

        const updatedGridState = [...gridState];

        for (
          let i = Math.max(0, startGridX);
          i < Math.min(endGridX, gridState.length);
          i++
        ) {
          for (
            let j = Math.max(0, startGridY);
            j < Math.min(endGridY, gridState[0].length);
            j++
          ) {
            updatedGridState[i][j] = true;
          }
        }

        onGridChange(updatedGridState);
        console.timeEnd('Mouse Move Detected')
      }
    };

    const handleGlobalMouseUp = (event: MouseEvent) => {
      console.log("Global Mouse Up");
      //On Global Mouse Up I will run the model

      if (!model) {
        console.log("Model not loaded yet. Please wait...");
        return;
      }
      const boolArray = rotateN90(
        rotateN90(rotateN90(gridState))
      ); /* your 64x64 boolean array */
      const uint8Array2D = [];

      var isNotEmpty = false;

      for (let i = 0; i < 64; i++) {
        const row = new Uint8Array(64);
        for (let j = 0; j < 64; j++) {
          row[j] = boolArray[i][j] ? 255 : 0;
          isNotEmpty = isNotEmpty || boolArray[i][j];
        }
        uint8Array2D.push(row);
      }
      if (!isNotEmpty) {
        setPredictedLabel("");
        onPredictionChange("");
      } else {
        let tensor = tf
          .tensor2d(uint8Array2D, [64, 64])
          .reshape([1, 64, 64, 1]) as tf.Tensor4D;
        let resizedTensor = tf.image.resizeBilinear(tensor, [28, 28]);

        let predictions = model.predict(resizedTensor) as tf.Tensor4D;
        let probabilities = tf.argMax(tf.softmax(predictions), 1).dataSync()[0];

        console.log(
          "I think that you are drawing a: " + labelMapping[probabilities]
        );

        setPredictedLabel(labelMapping[probabilities]);
        onPredictionChange(labelMapping[probabilities]);
      }
      setIsMouseDown(false);
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);

    if (divRef.current) {
      divRef.current.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      if (divRef.current) {
        divRef.current.removeEventListener("mousemove", handleMouseMove);
      }
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isMouseDown]);



  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const str = String(gridSize) + 'px ';


  return (
    <div
      className="grid-container"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      ref={divRef}
      style={{
        gridTemplateColumns:   str.repeat(64),
        //columnGap: `${gridGap}px`, 
        width: `${gridSize*64}px`,
        height: `${gridSize*64}px`}}
    >
      {gridState.map((row, x) => (
        <div key={x} className="grid-column">
          {row.map((cell: boolean, y) => (
            <GridCell gridSize={gridSize} isActive={cell} key={String(x) + String(y)}/>
          ))}
        </div>
      ))}

      {/* <div className="prediction-text">
        I think you are drawing a: {predictedLabel}
      </div>
      <button onClick={clearGrid} className="clear-grid-button">
        Reset Drawing
      </button> */}
    </div>
  );
};

export default Grid;
