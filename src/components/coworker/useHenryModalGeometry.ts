"use client";

import { useCallback, useEffect, useState } from "react";

export type HenryGeometry = { x: number; y: number; width: number; height: number };

const STORAGE_KEY = "henry-modal-geometry";
const DESKTOP_BREAKPOINT = 1024;
const EDGE_GAP = 16;
const MIN_WIDTH = 360;
const MIN_HEIGHT = 420;

function defaultGeometry(): HenryGeometry {
  if (typeof window === "undefined") return { x: 32, y: 32, width: 520, height: 680 };
  const width = Math.min(560, window.innerWidth - EDGE_GAP * 2);
  const height = Math.min(720, window.innerHeight - EDGE_GAP * 2);
  return { x: window.innerWidth - width - 32, y: 32, width, height };
}

function clampGeometry(geometry: HenryGeometry): HenryGeometry {
  if (typeof window === "undefined") return geometry;
  const maxWidth = Math.max(MIN_WIDTH, window.innerWidth - EDGE_GAP * 2);
  const maxHeight = Math.max(MIN_HEIGHT, window.innerHeight - EDGE_GAP * 2);
  const width = Math.min(Math.max(geometry.width, MIN_WIDTH), maxWidth);
  const height = Math.min(Math.max(geometry.height, MIN_HEIGHT), maxHeight);
  return {
    width,
    height,
    x: Math.min(Math.max(geometry.x, EDGE_GAP), window.innerWidth - width - EDGE_GAP),
    y: Math.min(Math.max(geometry.y, EDGE_GAP), window.innerHeight - height - EDGE_GAP),
  };
}

function readSavedGeometry() {
  if (typeof window === "undefined") return defaultGeometry();
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return defaultGeometry();
    const parsed = JSON.parse(value) as Partial<HenryGeometry>;
    if (
      typeof parsed.x !== "number"
      || typeof parsed.y !== "number"
      || typeof parsed.width !== "number"
      || typeof parsed.height !== "number"
    ) return defaultGeometry();
    return clampGeometry(parsed as HenryGeometry);
  } catch {
    return defaultGeometry();
  }
}

export function useHenryModalGeometry() {
  const [geometry, setGeometry] = useState<HenryGeometry>(() => readSavedGeometry());
  const [desktop, setDesktop] = useState(() => (
    typeof window !== "undefined"
    && window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`).matches
  ));

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const syncDesktop = () => setDesktop(media.matches);
    media.addEventListener("change", syncDesktop);
    const clampToViewport = () => setGeometry((current) => clampGeometry(current));
    window.addEventListener("resize", clampToViewport);
    return () => {
      media.removeEventListener("change", syncDesktop);
      window.removeEventListener("resize", clampToViewport);
    };
  }, []);

  useEffect(() => {
    if (!desktop) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(geometry));
  }, [desktop, geometry]);

  const beginPointerAction = useCallback((
    event: React.PointerEvent<HTMLElement>,
    action: "drag" | "resize",
  ) => {
    if (!desktop || event.button !== 0) return;
    event.preventDefault();
    const pointerId = event.pointerId;
    const target = event.currentTarget;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = geometry;
    target.setPointerCapture(pointerId);

    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setGeometry(clampGeometry(action === "drag"
        ? { ...start, x: start.x + dx, y: start.y + dy }
        : { ...start, width: start.width + dx, height: start.height + dy }));
    };
    const finish = (finishEvent: PointerEvent) => {
      if (finishEvent.pointerId !== pointerId) return;
      target.releasePointerCapture(pointerId);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", finish);
      target.removeEventListener("pointercancel", finish);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", finish);
    target.addEventListener("pointercancel", finish);
  }, [desktop, geometry]);

  const onHeaderPointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    beginPointerAction(event, "drag");
  }, [beginPointerAction]);
  const onResizePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
    beginPointerAction(event, "resize");
  }, [beginPointerAction]);

  return { desktop, geometry, onHeaderPointerDown, onResizePointerDown };
}
