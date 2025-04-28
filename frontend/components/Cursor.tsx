"use client";

import { useEffect, useState } from "react";

export interface CursorPosition {
  x: number;
  y: number;
}

interface CursorProps {
  name: string;
  color?: string;
  position?: CursorPosition;
  opacity?: number;
}

export default function Cursor({
  name,
  color = "#FF0000",
  position: initialPosition,
  opacity = 1,
}: CursorProps) {
  const [position, setPosition] = useState<CursorPosition>({ x: 0, y: 0 });

  useEffect(() => {
    // If position is provided as a prop, use it for other users' cursors
    if (initialPosition) {
      setPosition(initialPosition);
      return;
    }

    // Otherwise track mouse movement for the current user
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", updatePosition);
    return () => window.removeEventListener("mousemove", updatePosition);
  }, [initialPosition]);

  return (
    <div
      className="pointer-events-none fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
        opacity: opacity,
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="px-2 py-1 rounded-full text-sm ml-20 font-medium text-white whitespace-nowrap"
          style={{ backgroundColor: color }}
        >
          {name}
        </div>
      </div>
    </div>
  );
}
