"use client";

import { useEffect, useState } from "react";
import { CinematicScene } from "./cinematic-scene";

const STORAGE_KEY = "azez-boot-seen";
const BOOT_DURATION_MS = 2100;
const FADE_DURATION_MS = 650;

const TITLE = "AZEZ AI OS";

/**
 * Cinematic boot sequence shown once per session on the dashboard:
 * letterboxed 3D scene, title reveal, and a shimmer progress bar.
 * Click anywhere to skip. Respects reduced-motion by not showing at all.
 */
export function BootOverlay() {
  const [phase, setPhase] = useState<"boot" | "fade" | "done">("boot");

  useEffect(() => {
    let skipBoot = false;
    try {
      skipBoot =
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        window.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      skipBoot = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    if (skipBoot) {
      // One-time browser-only gate: skip the intro for reduced motion or repeat visits.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("done");
      return;
    }

    const bootTimer = window.setTimeout(() => setPhase("fade"), BOOT_DURATION_MS);
    const doneTimer = window.setTimeout(() => {
      setPhase("done");
      try {
        window.sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }, BOOT_DURATION_MS + FADE_DURATION_MS);
    return () => {
      window.clearTimeout(bootTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  const skip = () => {
    setPhase("done");
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={`boot-overlay${phase === "fade" ? " boot-fade" : ""}`}
      onClick={skip}
      role="presentation"
      aria-hidden="true"
    >
      <CinematicScene variant="hero" className="boot-scene" />
      <div className="boot-letterbox top" />
      <div className="boot-letterbox bottom" />
      <div className="boot-center">
        <p className="boot-kicker">نظام التشغيل الذكي لأعمالك</p>
        <h1 className="boot-title" dir="ltr">
          {TITLE.split("").map((letter, index) => (
            <span key={index} style={{ animationDelay: `${0.15 + index * 0.055}s` }}>
              {letter === " " ? "\u00A0" : letter}
            </span>
          ))}
        </h1>
        <div className="boot-progress" dir="ltr">
          <i />
        </div>
        <p className="boot-hint">انقر للتخطي</p>
      </div>
    </div>
  );
}
