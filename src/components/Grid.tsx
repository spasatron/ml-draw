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

const modelURL = "http://18.189.189.217/prediction/";

let model: tf.LayersModel;

async function loadModel() {
  console.log("Loading model...");
  const modelPath = "assets/model.json";
  const modelLoad = await tf.loadLayersModel(modelPath);
  model = modelLoad;
  console.log("Model loaded successfully!");
}

const gridGapVH = 0.3;
const gridSizeVH = 1.2;

function touchHandler(event: TouchEvent) {
  var touches = event.changedTouches,
    first = touches[0],
    type = "";
  switch (event.type) {
    case "touchstart":
      type = "mousedown";
      break;
    case "touchmove":
      type = "mousemove";
      break;
    case "touchend":
      type = "mouseup";
      break;
    default:
      return;
  }

  // initMouseEvent(type, canBubble, cancelable, view, clickCount,
  //                screenX, screenY, clientX, clientY, ctrlKey,
  //                altKey, shiftKey, metaKey, button, relatedTarget);

  var simulatedEvent = document.createEvent("MouseEvent");
  simulatedEvent.initMouseEvent(
    type,
    true,
    true,
    window,
    1,
    first.screenX,
    first.screenY,
    first.clientX,
    first.clientY,
    false,
    false,
    false,
    false,
    0 /*left*/,
    null
  );
  first.target.dispatchEvent(simulatedEvent);
  if (event.type === "touchmove") {
    event.preventDefault();
  }
}

function vhToPixels(vh: number): number {
  const height = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0
  );
  return Math.max(Math.floor((vh * height) / 100), 1);
}
function vwToPixels(vw: number): number {
  const width = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0
  );
  return Math.max(Math.floor((vw * width) / 100), 1);
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
  const previousPoint = useRef<{ x: number; y: number } | null>(null);
  let timeOutID: NodeJS.Timeout;
  const handleResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    console.time("Handle Resize: " + String(height) + " " + String(width));
    //Fullscreens can take advantage of this
    if (window.innerWidth >= 720) {
      setGridSize(Math.min(vhToPixels(gridSizeVH), vwToPixels(gridSizeVH)));
    }
    //Otherwise we need the entire thing
    else {
      setGridSize(Math.floor(window.innerWidth / 68));
    }
    document.body.style.overflow = "hidden";
    console.timeEnd("Handle Resize: " + String(height) + " " + String(width));
  };
  const brushSize = 2;

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

  function drawLineWithPoints(
    currentGridState: Uint8Array,
    point: { x: number; y: number },
    prevPoint: { x: number; y: number } | null
  ): Uint8Array {
    const brushRadius = Math.floor(brushSize / 2);

    let points = [point];
    if (prevPoint) {
      let distance = Math.max(
        Math.floor(
          Math.sqrt(
            Math.pow(point.x - prevPoint.x, 2) +
              Math.pow(point.y - prevPoint.y, 2)
          ) / 1.4
        ),
        0
      );
      console.log("Distance " + String(distance));
      for (let i = 0; i <= distance; i++) {
        points.push({
          x: Math.floor(
            point.x + ((distance - i) * (prevPoint.x - point.x)) / distance
          ),
          y: Math.floor(
            point.y + ((distance - i) * (prevPoint.y - point.y)) / distance
          ),
        });
      }
    }
    console.log(points);

    for (const p of points) {
      const startGridX = p.x - brushRadius;
      const endGridX = startGridX + brushSize;
      const startGridY = p.y - brushRadius;
      const endGridY = startGridY + brushSize;

      let k = 0,
        n = 0;
      for (let i = Math.max(0, startGridX); i < Math.min(endGridX, 64); i++) {
        for (let j = Math.max(0, startGridY); j < Math.min(endGridY, 64); j++) {
          k = j * 8 + Math.floor(i / 8);
          n = i % 8;

          currentGridState[k] = currentGridState[k] | (1 << (7 - n));
        }
      }
    }

    return currentGridState;
  }

  async function makeAPIPrediction(
    url: string,
    payload: { binaryData: string }
  ) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const apiPrediction = await response.json();

      console.log(apiPrediction["Response"]);
      //setPredictedLabel(apiPrediction["Response"]);
      onPredictionChange(apiPrediction["Response"]);
    } catch (error) {
      console.log("No Backend Response");
    }
  }

  function delayedAPICall() {
    console.log(gridState);
    const numbersString = Array.from(gridState).join(", ");
    //Check If Anything is Drawn
    console.log(numbersString);
    const base64String = btoa(
      String.fromCharCode.apply(null, Array.from(gridState))
    );
    console.log(base64String); // Welcome
    if (
      base64String ===
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    ) {
      setPredictedLabel("");
      onPredictionChange("");
    } else {
      makeAPIPrediction(modelURL, {
        binaryData: base64String,
      });
    }
  }

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isMouseDown && divRef.current) {
        console.time("Mouse Move Detected");
        const { width, height, left, top } =
          divRef.current.getBoundingClientRect();
        const { clientX, clientY } = event;
        const cellWidth = width / 64;
        //TODO change back to height once all components are rearanged
        const cellHeight = width / 64;

        let updatedGridState = drawLineWithPoints(
          gridState,
          {
            x: Math.floor((clientX - left) / cellWidth),
            y: Math.floor((clientY - top) / cellHeight),
          },
          previousPoint.current
        );

        previousPoint.current = {
          x: Math.floor((clientX - left) / cellWidth),
          y: Math.floor((clientY - top) / cellHeight),
        };

        //console.log(gridState);

        onGridChange(updatedGridState);
        console.timeEnd("Mouse Move Detected");
      }
    };

    const handleGlobalMouseUp = (event: MouseEvent) => {
      console.log("Global Mouse Up");
      previousPoint.current = null;
      clearTimeout(timeOutID);
      timeOutID = setTimeout(delayedAPICall, 1000);
      setIsMouseDown(false);
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

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
    window.addEventListener("resize", handleResize);
    document.addEventListener("touchstart", touchHandler, true);
    document.addEventListener("touchmove", touchHandler, { passive: false });
    document.addEventListener("touchend", touchHandler, true);
    document.addEventListener("touchcancel", touchHandler, true);
    handleResize();
    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("touchstart", touchHandler, true);
      document.removeEventListener("touchmove", touchHandler, true);
      document.removeEventListener("touchend", touchHandler, true);
      document.removeEventListener("touchcancel", touchHandler, true);
    };
  }, []);

  const str = String(gridSize) + "px ";
  return (
    <div
      className="grid-container"
      onMouseUp={handleMouseUp}
      ref={divRef}
      style={{
        gridTemplateRows: str.repeat(64),
        //columnGap: `${gridGap}px`,
        width: `${gridSize * 64}px`,
        height: `${gridSize * 64}px`,
      }}
    >
      {Array.from(gridState).map((row, x) => (
        <div key={x} className="grid-rows">
          <GridCell
            gridSize={gridSize}
            isActive={Boolean(row & (1 << 7))}
            key={String(x) + String(0)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={Boolean(row & (1 << 6))}
            key={String(x) + String(1)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={Boolean(row & (1 << 5))}
            key={String(x) + String(2)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={Boolean(row & (1 << 4))}
            key={String(x) + String(3)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={Boolean(row & (1 << 3))}
            key={String(x) + String(4)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={Boolean(row & (1 << 2))}
            key={String(x) + String(5)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={Boolean(row & (1 << 1))}
            key={String(x) + String(6)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={Boolean(row & (1 << 0))}
            key={String(x) + String(7)}
          />
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
