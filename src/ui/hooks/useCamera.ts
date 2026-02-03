import { useState, useCallback, useRef, useEffect } from 'react';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  setPosition: (x: number, y: number) => void;
}

export function useCamera(canvasRef: React.RefObject<HTMLCanvasElement | null>): CameraState {
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomSensitivity = 0.001;
    const minZoom = 0.5;
    const maxZoom = 10;

    setCamera(prev => {
      const newZoom = Math.min(Math.max(prev.zoom * (1 - e.deltaY * zoomSensitivity), minZoom), maxZoom);
      
      // Zoom towards mouse pointer logic would go here, 
      // but centering zoom is simpler for now.
      return { ...prev, zoom: newZoom };
    });
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return;

    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    setCamera(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);
  
  const setPosition = useCallback((x: number, y: number) => {
    setCamera(prev => ({ ...prev, x, y }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasRef, handleWheel, handleMouseDown, handleMouseMove, handleMouseUp]);

  return { ...camera, setPosition };
}
