import React, { useState, useRef, useEffect } from "react";
import GridCell from "./GridCell";
import "./Grid.css";

const brushSize = 2;

const modelURL = "http://18.189.189.217/prediction/";

const gridSizeVH = 1.2;

function drawLineWithPoints(
  currentGridState: Uint8Array,
  point: { x: number; y: number },
  prevPoint: { x: number; y: number } | null
): Uint8Array {
  const brushRadius = Math.floor(brushSize / 2);

  let points = [point];
  if (prevPoint) {
    let distance = Math.max(
      Math.floor(
        Math.sqrt(
          Math.pow(point.x - prevPoint.x, 2) +
            Math.pow(point.y - prevPoint.y, 2)
        ) / 1.4
      ),
      0
    );

    for (let i = 0; i <= distance; i++) {
      points.push({
        x: Math.floor(
          point.x + ((distance - i) * (prevPoint.x - point.x)) / distance
        ),
        y: Math.floor(
          point.y + ((distance - i) * (prevPoint.y - point.y)) / distance
        ),
      });
    }
  }

  for (const p of points) {
    const startGridX = p.x - brushRadius;
    const endGridX = startGridX + brushSize;
    const startGridY = p.y - brushRadius;
    const endGridY = startGridY + brushSize;

    let k = 0,
      n = 0;
    for (let i = Math.max(0, startGridX); i < Math.min(endGridX, 64); i++) {
      for (let j = Math.max(0, startGridY); j < Math.min(endGridY, 64); j++) {
        k = j * 8 + Math.floor(i / 8);
        n = i % 8;

        currentGridState[k] = currentGridState[k] | (1 << (7 - n));
      }
    }
  }

  return currentGridState;
}

function touchHandler(event: TouchEvent) {
  var touches = event.changedTouches,
    first = touches[0],
    type = "";
  switch (event.type) {
    case "touchstart":
      type = "mousedown";
      break;
    case "touchmove":
      type = "mousemove";
      break;
    case "touchend":
      type = "mouseup";
      break;
    default:
      return;
  }

  // initMouseEvent(type, canBubble, cancelable, view, clickCount,
  //                screenX, screenY, clientX, clientY, ctrlKey,
  //                altKey, shiftKey, metaKey, button, relatedTarget);

  var simulatedEvent = document.createEvent("MouseEvent");
  simulatedEvent.initMouseEvent(
    type,
    true,
    true,
    window,
    1,
    first.screenX,
    first.screenY,
    first.clientX,
    first.clientY,
    false,
    false,
    false,
    false,
    0 /*left*/,
    null
  );
  first.target.dispatchEvent(simulatedEvent);
  if (event.type === "touchmove") {
    event.preventDefault();
  }
}

function vhToPixels(vh: number): number {
  const height = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0
  );
  return Math.max(Math.floor((vh * height) / 100), 1);
}
function vwToPixels(vw: number): number {
  const width = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0
  );
  return Math.max(Math.floor((vw * width) / 100), 1);
}

interface GridProps {
  onPredictionChange: (newPrediction: string) => void;
  onClearedGrid: () => void;
  clearGrid: Boolean;
}
////////////// React Grid Component
const Grid: React.FC<GridProps> = ({
  onPredictionChange,
  onClearedGrid,
  clearGrid,
}) => {
  const gridState = useRef<Uint8Array>(new Uint8Array(512));
  const [gridSize, setGridSize] = useState<number>(vhToPixels(gridSizeVH));
  const [gridHasUpdated, setGridHasUpdated] = useState(0);
  const previousPoint = useRef<{ x: number; y: number } | null>(null);
  let timeOutID: NodeJS.Timeout;

  const divRef = useRef<HTMLDivElement>(null);

  const isMouseDown = useRef<Boolean>(false);

  const handleMouseDown = () => {
    isMouseDown.current = true;
  };

  const handleMouseUp = () => {
    isMouseDown.current = false;
  };

  const handleResize = () => {
    //Fullscreens can take advantage of this
    if (window.innerWidth >= 720) {
      setGridSize(Math.min(vhToPixels(gridSizeVH), vwToPixels(gridSizeVH)));
    }
    //Otherwise we need the entire thing
    else {
      setGridSize(Math.floor(window.innerWidth / 68));
    }
    document.body.style.overflow = "hidden";
  };

  async function makeAPIPrediction(
    url: string,
    payload: { binaryData: string }
  ) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const apiPrediction = await response.json();
      const base64String = btoa(
        String.fromCharCode.apply(null, Array.from(gridState.current))
      );

      onPredictionChange(apiPrediction["Response"]);
    } catch (error) {
      console.log("No Backend Response");
    }
  }
  function delayedAPICall() {
    console.log("API Request");
    //Check If Anything is Drawn
    const base64String = btoa(
      String.fromCharCode.apply(null, Array.from(gridState.current))
    );

    if (
      base64String ===
      "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
    ) {
      onPredictionChange("");
    } else {
      makeAPIPrediction(modelURL, {
        binaryData: base64String,
      });
    }
  }
  const handleMouseMove = (event: MouseEvent) => {
    if (isMouseDown.current && divRef.current) {
      const { width, height, left, top } =
        divRef.current.getBoundingClientRect();
      const { clientX, clientY } = event;
      const cellWidth = width / 64;
      //TODO change back to height once all components are rearanged
      const cellHeight = width / 64;

      let updatedGridState = drawLineWithPoints(
        gridState.current,
        {
          x: Math.floor((clientX - left) / cellWidth),
          y: Math.floor((clientY - top) / cellHeight),
        },
        previousPoint.current
      );

      previousPoint.current = {
        x: Math.floor((clientX - left) / cellWidth),
        y: Math.floor((clientY - top) / cellHeight),
      };

      gridState.current = updatedGridState.slice();
      setGridHasUpdated((prevState) => prevState + 1);
    }
  };

  const handleGlobalMouseUp = (event: MouseEvent) => {
    previousPoint.current = null;
    //delayedAPICall();
    clearTimeout(timeOutID);
    timeOutID = setTimeout(delayedAPICall, 1000);
    isMouseDown.current = false;
  };
  useEffect(() => {
    document.addEventListener("mouseup", handleGlobalMouseUp);
    document.addEventListener("mousedown", handleMouseDown);

    if (divRef.current) {
      divRef.current.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      if (divRef.current) {
        divRef.current.removeEventListener("mousemove", handleMouseMove);
      }
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    document.addEventListener("touchstart", touchHandler, true);
    document.addEventListener("touchmove", touchHandler, { passive: false });
    document.addEventListener("touchend", touchHandler, true);
    document.addEventListener("touchcancel", touchHandler, true);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("touchstart", touchHandler, true);
      document.removeEventListener("touchmove", touchHandler, true);
      document.removeEventListener("touchend", touchHandler, true);
      document.removeEventListener("touchcancel", touchHandler, true);
    };
  }, []);

  useEffect(() => {
    if (clearGrid == true) {
      let cleared_grid = new Uint8Array(512);
      gridState.current = cleared_grid.slice();
      setGridHasUpdated((prevState) => prevState + 1);
      onClearedGrid();
    }
  }, [clearGrid]);

  const str = String(gridSize) + "px ";

  return (
    <div
      className="grid-container"
      onMouseUp={handleMouseUp}
      ref={divRef}
      style={{
        gridTemplateRows: str.repeat(64),
        width: `${gridSize * 64}px`,
        height: `${gridSize * 64}px`,
      }}
    >
      {Array.from(gridState.current).map((row_val, idx) => (
        <div key={idx} className="grid-rows">
          <GridCell
            gridSize={gridSize}
            isActive={!!(row_val & (1 << 7))}
            key={String(idx) + String(0)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={!!(row_val & (1 << 6))}
            key={String(idx) + String(1)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={!!(row_val & (1 << 5))}
            key={String(idx) + String(2)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={!!(row_val & (1 << 4))}
            key={String(idx) + String(3)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={!!(row_val & (1 << 3))}
            key={String(idx) + String(4)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={!!(row_val & (1 << 2))}
            key={String(idx) + String(5)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={!!(row_val & (1 << 1))}
            key={String(idx) + String(6)}
          />

          <GridCell
            gridSize={gridSize}
            isActive={!!(row_val & (1 << 0))}
            key={String(idx) + String(7)}
          />
        </div>
      ))}
    </div>
  );
};

export default Grid;
