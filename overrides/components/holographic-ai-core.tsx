"use client";

import { useEffect, useRef, useState } from "react";

type RendererState = "pending" | "webgl" | "fallback";

type HolographicAICoreProps = {
  onActivate: () => void;
  label: string;
};

const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_pulse;
uniform float u_motion;

varying vec2 v_uv;

#define PI 3.14159265359
#define MAX_STEPS 78
#define FAR_CLIP 8.0
#define SURFACE_EPSILON 0.0015

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float hash21(vec2 point) {
  point = fract(point * vec2(123.34, 456.21));
  point += dot(point, point + 45.32);
  return fract(point.x * point.y);
}

float hash31(vec3 point) {
  point = fract(point * 0.1031);
  point += dot(point, point.yzx + 33.33);
  return fract((point.x + point.y) * point.z);
}

float valueNoise(vec3 point) {
  vec3 cell = floor(point);
  vec3 local = fract(point);
  local = local * local * (3.0 - 2.0 * local);

  float n000 = hash31(cell + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(cell + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(cell + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(cell + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(cell + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(cell + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(cell + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(cell + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, local.x);
  float nx10 = mix(n010, n110, local.x);
  float nx01 = mix(n001, n101, local.x);
  float nx11 = mix(n011, n111, local.x);
  float nxy0 = mix(nx00, nx10, local.y);
  float nxy1 = mix(nx01, nx11, local.y);
  return mix(nxy0, nxy1, local.z);
}

float sphereDistance(vec3 point, float radius) {
  return length(point) - radius;
}

float torusDistance(vec3 point, vec2 torus) {
  vec2 q = vec2(length(point.xz) - torus.x, point.y);
  return length(q) - torus.y;
}

vec2 unionMaterial(vec2 current, vec2 candidate) {
  return candidate.x < current.x ? candidate : current;
}

vec2 sceneDistance(vec3 point) {
  float time = u_time * u_motion;
  vec3 spherePoint = point;
  spherePoint.xy *= rotate2d(time * 0.13);
  spherePoint.yz *= rotate2d(time * 0.09);
  float distortion = (valueNoise(spherePoint * 4.2 + time * 0.18) - 0.5) * 0.055;
  float pulse = sin(time * 2.2) * 0.025 + u_pulse * 0.075;
  vec2 result = vec2(sphereDistance(spherePoint, 0.66 + distortion + pulse), 1.0);

  vec3 ringOne = point;
  ringOne.xy *= rotate2d(time * 0.22 + 0.55);
  ringOne.yz *= rotate2d(0.82);
  result = unionMaterial(result, vec2(torusDistance(ringOne, vec2(0.91, 0.018)), 2.0));

  vec3 ringTwo = point;
  ringTwo.xz *= rotate2d(-time * 0.18 + 0.25);
  ringTwo.xy *= rotate2d(1.08);
  result = unionMaterial(result, vec2(torusDistance(ringTwo, vec2(1.02, 0.014)), 3.0));

  vec3 ringThree = point;
  ringThree.yz *= rotate2d(time * 0.16 - 0.6);
  ringThree.xz *= rotate2d(0.64);
  result = unionMaterial(result, vec2(torusDistance(ringThree, vec2(1.13, 0.012)), 4.0));
  return result;
}

vec3 sceneNormal(vec3 point) {
  vec2 offset = vec2(SURFACE_EPSILON, 0.0);
  float center = sceneDistance(point).x;
  return normalize(vec3(
    sceneDistance(point + offset.xyy).x - center,
    sceneDistance(point + offset.yxy).x - center,
    sceneDistance(point + offset.yyx).x - center
  ));
}

vec2 marchScene(vec3 origin, vec3 direction) {
  float travel = 0.0;
  float material = 0.0;
  for (int index = 0; index < MAX_STEPS; index++) {
    vec3 point = origin + direction * travel;
    vec2 sampleValue = sceneDistance(point);
    material = sampleValue.y;
    if (sampleValue.x < SURFACE_EPSILON || travel > FAR_CLIP) break;
    travel += sampleValue.x * 0.72;
  }
  return vec2(travel, material);
}

vec3 cameraRay(vec2 uv, vec3 origin, vec3 target, float zoom) {
  vec3 forward = normalize(target - origin);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
  vec3 up = cross(forward, right);
  return normalize(forward * zoom + right * uv.x + up * uv.y);
}

float floorGrid(vec3 origin, vec3 direction) {
  if (direction.y >= -0.01) return 0.0;
  float planeTravel = (-1.06 - origin.y) / direction.y;
  if (planeTravel <= 0.0 || planeTravel > FAR_CLIP) return 0.0;
  vec3 point = origin + direction * planeTravel;
  vec2 grid = abs(fract(point.xz * 0.68) - 0.5) / max(fwidth(point.xz * 0.68), vec2(0.002));
  float line = 1.0 - min(min(grid.x, grid.y), 1.0);
  float radialFade = exp(-length(point.xz) * 0.22);
  float distanceFade = exp(-planeTravel * 0.18);
  return line * radialFade * distanceFade;
}

float particleField(vec2 uv, float time) {
  vec2 scaled = uv * vec2(64.0, 38.0);
  vec2 cell = floor(scaled);
  vec2 local = fract(scaled) - 0.5;
  float seed = hash21(cell);
  vec2 drift = vec2(sin(time * 0.11 + seed * 8.0), cos(time * 0.09 + seed * 6.0)) * 0.18;
  float distanceToParticle = length(local - drift);
  float sparkle = smoothstep(0.075, 0.0, distanceToParticle);
  sparkle *= smoothstep(0.82, 1.0, seed);
  sparkle *= 0.45 + 0.55 * sin(time * (0.7 + seed) + seed * 28.0) * 0.5 + 0.5;
  return sparkle;
}

void main() {
  vec2 resolution = max(u_resolution, vec2(1.0));
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
  uv.y *= -1.0;

  float time = u_time * u_motion;
  vec2 pointer = clamp(u_pointer, vec2(-1.0), vec2(1.0));
  vec3 origin = vec3(pointer.x * 0.52, -pointer.y * 0.28 + 0.12, 3.15 - u_pulse * 0.22);
  vec3 target = vec3(pointer.x * 0.08, -pointer.y * 0.04, 0.0);
  vec3 direction = cameraRay(uv, origin, target, 1.78);

  vec3 background = mix(vec3(0.006, 0.026, 0.045), vec3(0.012, 0.075, 0.105), max(0.0, 0.52 - length(uv)));
  background += vec3(0.04, 0.22, 0.28) * particleField(v_uv, time) * 0.8;
  background += vec3(0.025, 0.15, 0.20) * floorGrid(origin, direction) * 0.72;

  vec2 hit = marchScene(origin, direction);
  vec3 color = background;

  if (hit.x < FAR_CLIP) {
    vec3 point = origin + direction * hit.x;
    vec3 normal = sceneNormal(point);
    vec3 lightDirection = normalize(vec3(-0.45, 0.78, 0.62));
    float diffuse = max(dot(normal, lightDirection), 0.0);
    float fresnel = pow(1.0 - max(dot(normal, -direction), 0.0), 2.6);
    float scan = 0.5 + 0.5 * sin(point.y * 34.0 - time * 3.0);
    float circuitry = smoothstep(0.72, 0.98, valueNoise(point * 9.0 + time * 0.12));

    if (hit.y < 1.5) {
      vec3 deepCore = vec3(0.015, 0.16, 0.25);
      vec3 surfaceCore = vec3(0.08, 0.80, 0.96);
      vec3 emissive = mix(deepCore, surfaceCore, diffuse * 0.58 + fresnel * 0.72 + scan * 0.12);
      emissive += vec3(0.30, 0.92, 1.0) * circuitry * 0.65;
      emissive += vec3(0.10, 0.62, 0.88) * u_pulse * 0.85;
      color = emissive;
    } else {
      vec3 ringColor = hit.y < 2.5
        ? vec3(0.14, 0.92, 1.0)
        : hit.y < 3.5
          ? vec3(0.28, 0.62, 1.0)
          : vec3(0.48, 0.42, 1.0);
      color = ringColor * (1.2 + fresnel * 1.9 + diffuse * 0.6);
    }

    float fog = 1.0 - exp(-hit.x * hit.x * 0.045);
    color = mix(color, background, fog);
  }

  float coreGlow = 0.055 / max(0.02, dot(uv - pointer * vec2(0.06, -0.035), uv - pointer * vec2(0.06, -0.035)));
  color += vec3(0.01, 0.18, 0.25) * min(coreGlow, 1.8) * (0.34 + u_pulse * 0.32);

  float vignette = smoothstep(1.38, 0.18, length(uv * vec2(0.86, 1.0)));
  color *= 0.62 + vignette * 0.55;
  color = pow(color, vec3(0.88));
  gl_FragColor = vec4(color, clamp(0.34 + vignette, 0.0, 1.0));
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? "Unknown shader compilation error.";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create WebGL program.");
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? "Unknown WebGL linking error.";
    gl.deleteProgram(program);
    throw new Error(message);
  }
  return program;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function HolographicAICore({ onActivate, label }: HolographicAICoreProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const pulseRef = useRef(0);
  const [renderer, setRenderer] = useState<RendererState>("pending");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const contextOptions: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      depth: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    };
    const gl = (canvas.getContext("webgl2", contextOptions) ?? canvas.getContext("webgl", contextOptions)) as WebGLRenderingContext | null;
    if (!gl) {
      setRenderer("fallback");
      return;
    }

    let animationFrame = 0;
    let program: WebGLProgram | undefined;
    let buffer: WebGLBuffer | undefined;
    let disposed = false;
    const startedAt = performance.now();
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    function onContextLost(event: Event) {
      event.preventDefault();
      setRenderer("fallback");
    }

    try {
      program = createProgram(gl);
      buffer = gl.createBuffer() ?? undefined;
      if (!buffer) throw new Error("Unable to create WebGL geometry buffer.");

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.useProgram(program);

      const positionLocation = gl.getAttribLocation(program, "a_position");
      if (positionLocation < 0) throw new Error("WebGL position attribute is missing.");
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
      const pointerLocation = gl.getUniformLocation(program, "u_pointer");
      const timeLocation = gl.getUniformLocation(program, "u_time");
      const pulseLocation = gl.getUniformLocation(program, "u_pulse");
      const motionLocation = gl.getUniformLocation(program, "u_motion");

      const resize = () => {
        const bounds = canvas.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, bounds.width < 520 ? 1.45 : 1.8);
        const width = Math.max(1, Math.round(bounds.width * pixelRatio));
        const height = Math.max(1, Math.round(bounds.height * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        gl.viewport(0, 0, width, height);
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(canvas);
      resize();

      const render = (timestamp: number) => {
        if (disposed) return;
        const pointer = pointerRef.current;
        pointer.x += (pointer.targetX - pointer.x) * 0.055;
        pointer.y += (pointer.targetY - pointer.y) * 0.055;
        pulseRef.current *= 0.925;

        gl.useProgram(program!);
        if (resolutionLocation) gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        if (pointerLocation) gl.uniform2f(pointerLocation, pointer.x, pointer.y);
        if (timeLocation) gl.uniform1f(timeLocation, (timestamp - startedAt) * 0.001);
        if (pulseLocation) gl.uniform1f(pulseLocation, pulseRef.current);
        if (motionLocation) gl.uniform1f(motionLocation, reducedMotionQuery.matches ? 0.18 : 1.0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        animationFrame = window.requestAnimationFrame(render);
      };

      setRenderer("webgl");
      animationFrame = window.requestAnimationFrame(render);

      const onDeviceOrientation = (event: DeviceOrientationEvent) => {
        if (event.gamma == null || event.beta == null) return;
        pointerRef.current.targetX = clamp(event.gamma / 42, -1, 1);
        pointerRef.current.targetY = clamp((event.beta - 45) / 55, -1, 1);
      };
      window.addEventListener("deviceorientation", onDeviceOrientation, { passive: true });
      canvas.addEventListener("webglcontextlost", onContextLost, false);

      return () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        window.removeEventListener("deviceorientation", onDeviceOrientation);
        canvas.removeEventListener("webglcontextlost", onContextLost, false);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
      };
    } catch (error) {
      console.warn("AZEZ holographic WebGL core fell back to CSS rendering.", error);
      setRenderer("fallback");
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
    }
  }, []);

  function updatePointer(clientX: number, clientY: number, currentTarget: HTMLDivElement) {
    const bounds = currentTarget.getBoundingClientRect();
    pointerRef.current.targetX = clamp(((clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1, -1, 1);
    pointerRef.current.targetY = clamp(((clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 - 1, -1, 1);
  }

  function activate() {
    pulseRef.current = 1;
    onActivate();
  }

  return (
    <div
      className="holographic-scene webgl-ai-core"
      data-renderer={renderer}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerMove={(event) => updatePointer(event.clientX, event.clientY, event.currentTarget)}
      onPointerLeave={() => {
        pointerRef.current.targetX = 0;
        pointerRef.current.targetY = 0;
      }}
      onPointerDown={() => {
        pulseRef.current = 1;
      }}
      onClick={activate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          activate();
        }
      }}
    >
      <canvas ref={canvasRef} className="webgl-ai-core-canvas" aria-hidden="true" />
      <div className="webgl-core-fallback" aria-hidden="true">
        <div className="holo-grid" />
        <div className="holo-core"><span /><span /><span /></div>
      </div>
      <span className="webgl-core-badge" aria-hidden="true">
        {renderer === "webgl" ? "WEBGL CORE" : renderer === "fallback" ? "SAFE MODE" : "INITIALIZING"}
      </span>
    </div>
  );
}
