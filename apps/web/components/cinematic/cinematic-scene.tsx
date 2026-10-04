"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { createCinematicGraph, type CinematicVariant } from "./scene-graph";

type Props = {
  variant?: CinematicVariant;
  className?: string;
};

/**
 * Cinematic 3D backdrop: a neural core of particles wrapped in glowing
 * orbit rings over a drifting starfield, with a slow cinematic camera
 * drift and pointer parallax. Renders one static frame when the user
 * prefers reduced motion, and pauses itself when off-screen.
 */
export function CinematicScene({ variant = "hero", className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const graph = createCinematicGraph(variant);
    const { scene, camera } = graph;

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);

    let visible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.02 },
    );
    observer.observe(mount);

    let raf = 0;

    const renderFrame = (time: number) => {
      graph.update(time, pointer);
      renderer.render(scene, camera);
    };

    if (reducedMotion) {
      renderFrame(1400);
    } else {
      const loop = (time: number) => {
        raf = requestAnimationFrame(loop);
        if (!visible || document.hidden) return;
        renderFrame(time);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      graph.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [variant]);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}
