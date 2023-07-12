import React, { useState, useRef, useEffect } from "react";
import GridCell from "./GridCell";
import "./Grid.css";

import * as tf from "@tensorflow/tfjs";
import { render } from "react-dom";

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
  gridState: Uint8Array;
  onGridChange: (newGrid: Uint8Array) => void;
}

const Grid: React.FC<GridProps> = ({
  onPredictionChange,
  gridState,
  onGridChange,
}) => {
  const [predictedLabel, setPredictedLabel] = useState("");
  const [gridSize, setGridSize] = useState<number>(vhToPixels(gridSizeVH));
  const renderTimes = useRef(1);
  const previousPoint = useRef<{x: number; y: number;} | null>(null);


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


  function drawLineWithPoints(currentGridState: Uint8Array, point: {x: number; y: number}, prevPoint: {x: number; y: number} | null) : Uint8Array{
    const brushRadius = Math.floor(brushSize / 2);

    let points = [point];
    if(prevPoint){
      let distance = Math.max(Math.floor(Math.sqrt(Math.pow(point.x - prevPoint.x, 2) + Math.pow(point.y - prevPoint.y, 2))/2), 0);
      console.log("Distance " + String(distance))
      for(let i = 0; i <= distance; i++){
        points.push({x: Math.floor(point.x + (distance-i)*(prevPoint.x - point.x)/distance), y: Math.floor(point.y + (distance-i)*(prevPoint.y - point.y)/distance)})
      }
    }
    console.log(points);

    for (const p of points){

      const startGridX = p.x - brushRadius;
      const endGridX = startGridX + brushSize;
      const startGridY = p.y - brushRadius;
      const endGridY = startGridY + brushSize;

      let k = 0, n = 0;
      for (
        let i = Math.max(0, startGridX);
        i < Math.min(endGridX, 64);
        i++
      ) {
        for (
          let j = Math.max(0, startGridY);
          j < Math.min(endGridY, 64);
          j++
        ) {
          k = j*8 + Math.floor(i/8);
          n = i % 8;

          currentGridState[k] = currentGridState[k] | (1 << 7 - n);
        }
      }
    }


    return currentGridState;

  };



  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isMouseDown && divRef.current) {
        console.time('Mouse Move Detected')
        const { width, height, left, top } =
          divRef.current.getBoundingClientRect();
        const { clientX, clientY } = event;
        const cellWidth = width / 64;
        //TODO change back to height once all components are rearanged
        const cellHeight = width / 64;

        let updatedGridState = drawLineWithPoints(gridState,  {x: Math.floor((clientX - left) / cellWidth), y: Math.floor((clientY - top) / cellHeight)}, previousPoint.current);

        previousPoint.current = {x: Math.floor((clientX - left) / cellWidth), y: Math.floor((clientY - top) / cellHeight)}

        //console.log(gridState);
       
        onGridChange(updatedGridState);
        console.timeEnd('Mouse Move Detected');
      }
    };

    const handleGlobalMouseUp = (event: MouseEvent) => {
      console.log("Global Mouse Up");
      previousPoint.current = null;
      //On Global Mouse Up I will run the model

      if (!model) {
        console.log("Model not loaded yet. Please wait...");
        return;
      }

      var isNotEmpty = true;
      // Create a 64x64 boolean array
      const booleanArray: number[][] = [];
      for (let i = 0; i < 64; i++) {
        booleanArray[i] = [];
      }

      // Convert Uint8Array to boolean array
      let index = 0;
      for (let y = 0; y < 64; y++) {
        for (let x = 0; x < 64; x++) {
          const byteIndex = Math.floor(index / 8);
          const bitOffset = index % 8;
          const byteValue = gridState[byteIndex];
          const booleanValue = (byteValue & (1 << (7 - bitOffset))) !== 0;
          booleanArray[y][x] = booleanValue ? 255 : 0;
          index++;
        }
      }
      //console.log(booleanArray)
      if (!isNotEmpty) {
        setPredictedLabel("");
        onPredictionChange("");
      } else {
        let tensor = tf
          .tensor2d(booleanArray, [64, 64])
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
    document.addEventListener("mousedown", handleMouseDown)

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
      onMouseUp={handleMouseUp}
      ref={divRef}
      style={{
        gridTemplateRows:   str.repeat(64),
        //columnGap: `${gridGap}px`, 
        width: `${gridSize*64}px`,
        height: `${gridSize*64}px`}}
    >
      {Array.from(gridState).map((row, x) => (

        <div key={x} className="grid-rows">
          <GridCell gridSize={gridSize} isActive={Boolean(row & (1 << 7))} key={String(x) + String(0)}/>

          <GridCell gridSize={gridSize} isActive={Boolean(row & (1 << 6))} key={String(x) + String(1)}/>

          <GridCell gridSize={gridSize} isActive={Boolean(row & (1 << 5))} key={String(x) + String(2)}/>

          <GridCell gridSize={gridSize} isActive={Boolean(row & (1 << 4))} key={String(x) + String(3)}/>

          <GridCell gridSize={gridSize} isActive={Boolean(row & (1 << 3))} key={String(x) + String(4)}/>

          <GridCell gridSize={gridSize} isActive={Boolean(row & (1 << 2))} key={String(x) + String(5)}/>

          <GridCell gridSize={gridSize} isActive={Boolean(row & (1 << 1))} key={String(x) + String(6)}/>

          <GridCell gridSize={gridSize} isActive={Boolean(row & (1 << 0))} key={String(x) + String(7)}/>
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
