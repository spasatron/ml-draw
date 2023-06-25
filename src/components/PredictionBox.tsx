import "./Grid.css";
function PredictionBox({ prediction }: { prediction: string }) {
  return (
    <div className="prediction-box prediction-text">
      I think you are drawing a(n) {prediction}
    </div>
  );
}

export default PredictionBox;
