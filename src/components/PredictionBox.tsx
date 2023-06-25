import React, { useState, useRef, useEffect } from "react";
import "./Grid.css";

function is_vowel(str: string) {
  return str.match("a|e|i|o|u/i") ? true : false;
}

interface PredictionBoxProps {
  prediction: string;
  gridState: any[][];
  onGridChange: (newGrid: any[][]) => void;
  onPredictionChange: (newString: string) => void;
}

const PredictionBox: React.FC<PredictionBoxProps> = ({
  prediction,
  gridState,
  onGridChange,
  onPredictionChange,
}) => {
  function clearGrid() {
    const updatedGridState = [...gridState];
    for (let i = 0; i < 64; i++) {
      for (let j = 0; j < 64; j++) {
        updatedGridState[i][j] = false;
      }
    }
    onGridChange(updatedGridState);
    onPredictionChange("");
  }

  if (!prediction) {
    return (
      <div className="prediction-wrapper">
        <div className="prediction-box prediction-text">Draw Something!</div>
        <button className="reset-button" onClick={clearGrid}>
          Reset Drawing
        </button>
      </div>
    );
  }
  return (
    <div className="prediction-wrapper">
      <div className="prediction-box prediction-text">
        I think you are drawing {is_vowel(prediction[0]) ? "an " : "a "}{" "}
        {prediction}
      </div>
      <button className="reset-button" onClick={clearGrid}>
        Reset Drawing
      </button>
    </div>
  );
};

export default PredictionBox;
