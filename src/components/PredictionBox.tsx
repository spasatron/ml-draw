import React, { useState, useRef, useEffect } from "react";
import "./Grid.css";

function is_vowel(str: string) {
  return str.match("a|e|i|o|u/i") ? true : false;
}

interface PredictionBoxProps {
  prediction: string;
  causeClearGrid: () => void;
  onPredictionChange: (newString: string) => void;
}

const PredictionBox: React.FC<PredictionBoxProps> = ({
  prediction,
  causeClearGrid,
  onPredictionChange,
}) => {
  function clearGrid() {
    causeClearGrid();
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
