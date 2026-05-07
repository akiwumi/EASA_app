"use client";
import { useEffect } from "react";

// iOS standalone (home screen) mode has no browser pull-to-refresh.
// This restores that gesture: drag down from the top >80px triggers a reload.
export default function PullToRefresh() {
  useEffect(() => {
    const isStandalone =
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
      matchMedia("(display-mode: standalone)").matches;

    if (!isStandalone) return;

    let startY = 0;
    let pulling = false;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
        pulling = true;
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling) return;
      if (e.touches[0].clientY - startY > 80) {
        pulling = false;
        window.location.reload();
      }
    }

    function onTouchEnd() {
      pulling = false;
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return null;
}
