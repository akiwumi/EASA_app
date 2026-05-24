"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaLifecycle() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // A new version is available — reload when user next navigates
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        })
        .catch(() => {});
    }

    // Detect iOS
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setIsIos(ios);

    // Detect standalone mode (already installed)
    const standalone =
      ("standalone" in navigator && (navigator as { standalone?: boolean }).standalone === true) ||
      matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);

    // Check if user has already dismissed the banner this session
    const dismissed = sessionStorage.getItem("pwa-banner-dismissed");

    if (!standalone && !dismissed) {
      if (ios) {
        // Show iOS instructions after a short delay
        const t = setTimeout(() => setShowBanner(true), 3000);
        return () => clearTimeout(t);
      }
    }
  }, []);

  // Chrome / Android: intercept beforeinstallprompt
  useEffect(() => {
    const dismissed = sessionStorage.getItem("pwa-banner-dismissed");
    if (isStandalone || dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStandalone]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (!showBanner || isStandalone) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4rem)] left-3 right-3 z-[200] sm:bottom-6 sm:left-auto sm:right-6 sm:w-[340px]"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--easa-color-border)] bg-[var(--easa-color-brand-primary)] px-4 py-4 shadow-[var(--easa-shadow-brand)]">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
          <Download size={16} strokeWidth={2.25} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight text-white">
            Add to Home Screen
          </p>
          {isIos ? (
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              Tap the Share button{" "}
              <span className="font-bold text-white/90">⎙</span> then{" "}
              <span className="font-semibold text-white/90">&ldquo;Add to Home Screen&rdquo;</span>{" "}
              to install Flight Lyceum.
            </p>
          ) : (
            <p className="mt-1 text-xs leading-relaxed text-white/70">
              Install Flight Lyceum for offline access and a faster experience.
            </p>
          )}

          {!isIos && (
            <button
              type="button"
              onClick={handleInstall}
              className="mt-3 rounded-xl bg-white px-4 py-1.5 text-xs font-semibold text-[var(--easa-color-brand-primary)] transition hover:bg-white/90"
            >
              Install app
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Dismiss"
          onClick={handleDismiss}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/15 hover:text-white"
        >
          <X size={14} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
