import "./Grid.css";
import { memo } from 'react';

const GridCell = memo(function GridCell({ gridSize, isActive}: {gridSize: number, isActive: boolean}) {
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
});

export default GridCell;
