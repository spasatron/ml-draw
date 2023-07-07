import "./Grid.css";


function GridCell({ isActive, gridSize}: { isActive: boolean , gridSize: number}) {
  const style = {
    height: `${gridSize}px`,
    width: `${gridSize}px`
    //borderRadius: borderStyle
  };


  return (
    <div
      className={
        isActive ? "active-cell grid-cell" : "non-active-cell grid-cell"
      }
      style={style}
    ></div>
  );
}

export default GridCell;
