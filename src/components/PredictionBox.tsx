import React, { useState, useRef, useEffect } from "react";
import "./Grid.css";

function is_vowel(str: string) {
  return str.match("a|e|i|o|u/i") ? true : false;
}

interface PredictionBoxProps {
  prediction: string;
  gridState: Uint8Array;
  onGridChange: (newGrid: Uint8Array) => void;
  onPredictionChange: (newString: string) => void;
}

const PredictionBox: React.FC<PredictionBoxProps> = ({
  prediction,
  gridState,
  onGridChange,
  onPredictionChange,
}) => {
  function clearGrid() {
    const updatedGridState = new Uint8Array(512);
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
      <div className="prediction-box prediction-text">{prediction}</div>
      <button className="reset-button" onClick={clearGrid}>
        Reset Drawing
      </button>
    </div>
  );
};

export default PredictionBox;
