"use client";

// Client-component boundary so dynamic() is valid here.
// ssr:false ensures PwaLifecycle (which reads navigator/window) is
// never included in server-rendered HTML, preventing hydration mismatches.
import dynamic from "next/dynamic";

const PwaLifecycle = dynamic(() => import("./PwaLifecycle"), { ssr: false });

export default function PwaWrapper() {
  return <PwaLifecycle />;
}
