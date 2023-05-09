import "./Grid.css";
function GridCell({ isActive }: { isActive: boolean }) {
  return (
    <div
      className={
        isActive ? "active-cell grid-cell" : "non-active-cell grid-cell"
      }
    ></div>
  );
}

export default GridCell;
