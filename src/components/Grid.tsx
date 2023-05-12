import React, { useState, useRef, useEffect } from "react";
import GridCell from "./GridCell";
import "./Grid.css";

function Grid() {
  const [gridState, setGridState] = useState(
    Array.from({ length: 64 }, () => Array(64).fill(false))
  );
  let brushSize = 2;
  const divRef = useRef<HTMLDivElement>(null);

  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleMouseDown = () => {
    console.log("Local Mouse Down");
    setIsMouseDown(true);
  };

  const handleMouseUp = () => {
    console.log("Local Mouse Up");
    setIsMouseDown(false);
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isMouseDown && divRef.current) {
        const { width, height, left, top } =
          divRef.current.getBoundingClientRect();
        const { clientX, clientY } = event;
        const cellWidth = width / gridState.length;
        const cellHeight = height / gridState[0].length;

        const brushRadius = Math.floor(brushSize / 2);

        const startGridX =
          Math.floor((clientX - left) / cellWidth) - brushRadius;
        const endGridX = startGridX + brushSize;
        const startGridY =
          Math.floor((clientY - top) / cellHeight) - brushRadius;
        const endGridY = startGridY + brushSize;

        const updatedGridState = [...gridState];

        for (
          let i = Math.max(0, startGridX);
          i < Math.min(endGridX, gridState.length);
          i++
        ) {
          for (
            let j = Math.max(0, startGridY);
            j < Math.min(endGridY, gridState[0].length);
            j++
          ) {
            updatedGridState[i][j] = true;
          }
        }

        setGridState(updatedGridState);
      }
    };

    const handleGlobalMouseUp = (event: MouseEvent) => {
      console.log("Global Mouse Up");
      setIsMouseDown(false);
    };

    document.addEventListener("mouseup", handleGlobalMouseUp);

    if (divRef.current) {
      divRef.current.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      if (divRef.current) {
        divRef.current.removeEventListener("mousemove", handleMouseMove);
      }
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isMouseDown]);

  return (
    <div
      className="grid-container"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      ref={divRef}
    >
      {gridState.map((row, x) => (
        <div key={x} className="grid-column">
          {row.map((cell: boolean, y) => (
            <GridCell isActive={cell} key={String(x) + String(y)} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default Grid;
