import Grid from "./Grid";
import React, { useState, useRef, useEffect } from "react";
import PredictionBox from "./PredictionBox";
import "./Grid.css";
function GridWrapper() {
  const [predictionText, setPredictionText] = useState("");

  const predictionStateUpdate = (newValue: string) => {
    console.log(newValue);
    setPredictionText(newValue);
  };

  return (
    <div className="grid-wrapper">
      <div className="grid-component-wrapper">
        <Grid onPredictionChange={predictionStateUpdate} />
        <PredictionBox prediction={predictionText} />
      </div>
    </div>
  );
}

export default GridWrapper;
