import Grid from "./Grid";
import React, { useState, useRef, useEffect } from "react";
import PredictionBox from "./PredictionBox";
import "./Grid.css";

function GridWrapper() {
  const [predictionText, setPredictionText] = useState("");
  const [clearGrid, setClearGrid] = useState(false);


  const causeClearGrid = () => {
    setClearGrid(true);
  }

  const gridCleared = () => {
    setClearGrid(false);
  }
  const predictionStateUpdate = (newValue: string) => {
    setPredictionText(newValue);
  };

  return (
    <div className="grid-wrapper">
      <div className="grid-component-wrapper">
        <Grid
          onPredictionChange={predictionStateUpdate}
          onClearedGrid={gridCleared}
          clearGrid={clearGrid}
        />
        <PredictionBox
          prediction={predictionText}
          causeClearGrid={causeClearGrid}
          onPredictionChange={predictionStateUpdate}
        />
      </div>
    </div>
  );
}

export default GridWrapper;
