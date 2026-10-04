import { describe, expect, it } from "vitest";
import { BootOverlay } from "./boot-overlay";
import { CinematicScene } from "./cinematic-scene";
import { createCinematicGraph } from "./scene-graph";

describe("cinematic components", () => {
  it("exports the 3D scene and boot overlay components", () => {
    expect(typeof CinematicScene).toBe("function");
    expect(typeof BootOverlay).toBe("function");
  });
});

describe("cinematic scene graph", () => {
  it("builds the hero variant with the expected particle counts", () => {
    const graph = createCinematicGraph("hero");
    expect(graph.counts).toEqual({ core: 1500, innerCore: 750, stars: 1100, rings: 2 });
    graph.dispose();
  });

  it("builds the ambient variant lighter than hero", () => {
    const graph = createCinematicGraph("ambient");
    expect(graph.counts).toEqual({ core: 700, innerCore: 350, stars: 600, rings: 0 });
    graph.dispose();
  });

  it("animates frames without producing invalid numbers", () => {
    for (const variant of ["hero", "ambient"] as const) {
      const graph = createCinematicGraph(variant);
      const pointer = { x: 0.4, y: -0.3 };
      for (let frame = 0; frame < 90; frame += 1) {
        graph.update(frame * 16.7, pointer);
        const position = graph.camera.position;
        expect(Number.isFinite(position.x)).toBe(true);
        expect(Number.isFinite(position.y)).toBe(true);
        expect(Number.isFinite(position.z)).toBe(true);
      }
      let finite = true;
      graph.scene.traverse((object) => {
        object.position.toArray().forEach((value) => {
          if (!Number.isFinite(value)) finite = false;
        });
      });
      expect(finite).toBe(true);
      graph.dispose();
    }
  });

  it("disposes geometries and materials without throwing", () => {
    const graph = createCinematicGraph("hero");
    expect(() => graph.dispose()).not.toThrow();
  });
});
