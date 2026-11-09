"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Plate, type PlateName } from "../Plate";
import { tokenRGB } from "./noise";

/**
 * Live halftone (or film) screen over a grayscale frame atlas, on the GPU.
 * Frames come from the observatory-imprint generator (`--only frames`).
 *
 * - halftone: 45° round-dot screen, electric ink on paper (the plate look, moving)
 * - film:     continuous tone, deep electric → lavender with live grain (the film reference)
 *
 * Pauses off-screen, caps DPR at 2, shows one still frame under prefers-reduced-motion,
 * and falls back to the static <Plate> when WebGL or the atlas fails.
 * Must render inside BrandRoot (reads --bo-ink, --bo-paper, --bo-lavender).
 */

export type MotionAtlas = {
  src: string;
  cols: number;
  rows: number;
  frames: number;
  frameWidth: number;
  frameHeight: number;
};

export const ATLASES = {
  offshoreWind: {
    src: "/brand/plates/turbine-atlas-4x6-768x432.jpg",
    cols: 4,
    rows: 6,
    frames: 24,
    frameWidth: 768,
    frameHeight: 432,
  },
} as const satisfies Record<string, MotionAtlas>;

export type HalftoneMode = "halftone" | "film";

const VS = "attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}";
const FS = `precision highp float;varying vec2 v;uniform sampler2D T;uniform vec2 grid,crop;uniform float f0,f1,mx,mode,cell,time;uniform vec3 ink,paper,hi,deep;
float tone(float f,vec2 uv){float c=mod(f,grid.x),r=floor(f/grid.x);uv=clamp(uv,.002,.998);return texture2D(T,(vec2(c,r)+vec2(uv.x,1.-uv.y))/grid).r;}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 uv=(v-.5)*crop+.5;float t=mix(tone(f0,uv),tone(f1,uv),mx);vec2 px=gl_FragCoord.xy;
float g=hash(floor(px)+floor(time*24.)*vec2(17.,31.))-.5;
if(mode<.5){float a=.7853982;vec2 q=vec2(px.x*cos(a)+px.y*sin(a),-px.x*sin(a)+px.y*cos(a))*6.2831853/cell;
float s=.5+.25*(cos(q.x)+cos(q.y));float cov=1.-t+g*.14;float k=1.-smoothstep(cov-.035,cov+.035,s);gl_FragColor=vec4(mix(paper,ink,k),1.);}
else{float tt=clamp(t+g*.26,0.,1.);tt=smoothstep(.12,.98,tt);vec3 c=tt<.5?mix(deep,ink,tt*2.):mix(ink,hi,(tt-.5)*2.);gl_FragColor=vec4(c,1.);}}`;

export function HalftoneMotion({
  atlas,
  mode = "halftone",
  fps = 12,
  cell = 5.5,
  paused = false,
  fallback,
  label,
  className = "",
  style,
}: {
  atlas: MotionAtlas | keyof typeof ATLASES;
  mode?: HalftoneMode;
  /** Atlas frames per second; frames crossfade, so 8–14 reads smooth. */
  fps?: number;
  /** Screen pitch in CSS px. */
  cell?: number;
  paused?: boolean;
  /** Static plate shown if WebGL is unavailable. */
  fallback?: PlateName;
  /** Accessible description; omit for decorative use. */
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const pausedRef = useRef(paused);
  const drawRef = useRef<() => void>(() => {});
  const [failed, setFailed] = useState(false);
  const a: MotionAtlas = typeof atlas === "string" ? ATLASES[atlas] : atlas;

  useEffect(() => {
    modeRef.current = mode;
    pausedRef.current = paused;
    drawRef.current();
  }, [mode, paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false });
    if (!gl) {
      setFailed(true);
      return;
    }
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) throw new Error("shader");
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "compile");
      return s;
    };
    let prog: WebGLProgram;
    try {
      const p = gl.createProgram();
      if (!p) throw new Error("program");
      gl.attachShader(p, compile(gl.VERTEX_SHADER, VS));
      gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error("link");
      prog = p;
    } catch {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = (n: string) => gl.getUniformLocation(prog, n);
    gl.uniform3fv(U("ink"), tokenRGB(canvas, "--bo-ink", [0.024, 0.094, 0.961]));
    gl.uniform3fv(U("paper"), tokenRGB(canvas, "--bo-paper", [0.992, 0.992, 1]));
    gl.uniform3fv(U("hi"), tokenRGB(canvas, "--bo-lavender", [0.612, 0.62, 1]));
    gl.uniform3fv(U("deep"), [0.02, 0.02, 0.62]);
    gl.uniform2f(U("grid"), a.cols, a.rows);

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ready = false;
    let visible = true;
    let raf = 0;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      const ca = canvas.width / canvas.height;
      const fa = a.frameWidth / a.frameHeight;
      gl.uniform2f(U("crop"), ca > fa ? 1 : ca / fa, ca > fa ? fa / ca : 1);
      gl.uniform1f(U("cell"), cell * dpr);
    };
    const draw = (now = performance.now()) => {
      if (!ready) return;
      const t = reduced ? 0 : now / 1000;
      const fpos = (t * fps) % a.frames;
      const f0 = Math.floor(fpos);
      gl.uniform1f(U("f0"), f0);
      gl.uniform1f(U("f1"), (f0 + 1) % a.frames);
      gl.uniform1f(U("mx"), fpos - f0);
      gl.uniform1f(U("mode"), modeRef.current === "film" ? 1 : 0);
      gl.uniform1f(U("time"), t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    drawRef.current = () => draw();

    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
      ready = true;
      resize();
      draw();
    };
    img.onerror = () => setFailed(true);
    img.src = a.src;

    const ro = new ResizeObserver(() => {
      if (ready) {
        resize();
        draw();
      }
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);
    const loop = (now: number) => {
      if (visible && !reduced && !pausedRef.current) draw(now);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      drawRef.current = () => {};
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [a.src, a.cols, a.rows, a.frames, a.frameWidth, a.frameHeight, fps, cell]);

  if (failed && fallback) {
    return <Plate name={fallback} className={className} style={style} label={label} />;
  }
  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%", ...style }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    />
  );
}
