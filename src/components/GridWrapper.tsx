import Grid from "./Grid";
import React, { useState, useRef, useEffect } from "react";
import PredictionBox from "./PredictionBox";
import "./Grid.css";


function GridWrapper() {
  const [predictionText, setPredictionText] = useState("");
  const [gridState, setGridState] = useState(new Uint8Array(512));


  const handleGridStateChange = (newGridState: Uint8Array) => {
    console.log("setting new state");
    setGridState(newGridState.slice());
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
          onGridChange={handleGridStateChange}
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
