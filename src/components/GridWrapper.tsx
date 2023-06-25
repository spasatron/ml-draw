import Grid from "./Grid";
import React, { useState, useRef, useEffect } from "react";
import PredictionBox from "./PredictionBox";
import "./Grid.css";
function GridWrapper() {
  const [predictionText, setPredictionText] = useState("");
  const [gridState, setGridState] = useState(
    Array.from({ length: 64 }, () => Array(64).fill(false))
  );

  const handleGridStateChange = (newGridState: any[][]) => {
    setGridState(newGridState);
  };

  const predictionStateUpdate = (newValue: string) => {
    console.log(newValue);
    setPredictionText(newValue);
  };

  return (
    <div className="grid-wrapper">
      <div className="grid-component-wrapper">
        <Grid
          onPredictionChange={predictionStateUpdate}
          gridState={gridState}
          onGridChange={setGridState}
        />
        <PredictionBox
          prediction={predictionText}
          gridState={gridState}
          onGridChange={setGridState}
          onPredictionChange={predictionStateUpdate}
        />
      </div>
    </div>
  );
}

export default GridWrapper;
