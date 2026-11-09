/**
 * Inside the home — the engraved 3D cutaway (three.js).
 * A two-storey British terrace, front-right quarter cut away to show rooms, stair, loft and cavity.
 * Brand rendering: paper faces, ink edges, hatching measured by light, dense hatching on cut faces,
 * per-layer overlay patterns that grow by density (dots / waves / cross-hatch / grid / hatch).
 * Illustrative only — not a surveyed property.
 */

import * as THREE from "three";
import type { LayerId } from "./features";

/* ——— Engraving material ——— */

const VERT = /* glsl */ `
varying vec3 vN;
void main() {
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uInk;
uniform vec3 uPaper;
uniform vec3 uOverlay;
uniform vec3 uLight;
uniform float uPx;
uniform float uSection;
uniform float uPattern;
uniform float uAmount;
uniform float uHover;
varying vec3 vN;

float stripe(vec2 p, vec2 dir, float sp, float w) {
  float c = dot(p, dir) / sp;
  float d = abs(fract(c) - 0.5) * sp;
  return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.75, d);
}

void main() {
  vec2 p = gl_FragCoord.xy / uPx;
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  float lam = clamp(dot(n, normalize(uLight)), 0.0, 1.0);
  float tone = 1.0 - lam;

  float ink = 0.0;
  vec2 d1 = normalize(vec2(1.0, 1.0));
  vec2 d2 = normalize(vec2(1.0, -1.0));
  if (uSection > 0.5) {
    ink = stripe(p, d1, 6.5, 0.5);
  } else {
    // Measured hatching: only faces turned from the light take strokes; deep shade takes a second pass.
    // Clean engraving: one fine hatch pass, only where the form turns into deep shade.
    if (tone > 0.6) ink = max(ink, stripe(p, d1, 10.0, 0.5));
  }

  // Overlay: density grows with uAmount (dot radius / stroke width), never opacity.
  float a = clamp(uAmount, 0.0, 1.0);
  float m = 0.0;
  if (a > 0.001) {
    if (uPattern < 1.5) {
      vec2 g = mod(p, 5.0) - 2.5;
      float r = 0.4 + 1.5 * a;
      m = 1.0 - smoothstep(r, r + 0.6, length(g));
    } else if (uPattern < 2.5) {
      float y = p.y + sin(p.x * 0.33) * 2.0;
      m = 1.0 - smoothstep(0.25 + 1.1 * a, 0.25 + 1.1 * a + 0.6, abs(mod(y, 6.0) - 3.0));
    } else if (uPattern < 3.5) {
      m = max(stripe(p, d1, 4.5, 0.3 + 1.1 * a), stripe(p, d2, 4.5, 0.3 + 1.1 * a));
    } else if (uPattern < 4.5) {
      m = max(stripe(p, vec2(1.0, 0.0), 6.0, 0.3 + 1.0 * a), stripe(p, vec2(0.0, 1.0), 6.0, 0.3 + 1.0 * a));
    } else {
      m = stripe(p, normalize(vec2(1.0, 0.35)), 3.4, 0.3 + 1.2 * a);
    }
  }

  vec3 col = uPaper;
  col = mix(col, uOverlay, m);
  col = mix(col, uInk, ink * (1.0 - m));

  // Hover: a fixed ink dot screen (on/off, not a fade).
  if (uHover > 0.5) {
    vec2 g = mod(p + 1.0, 4.0) - 2.0;
    float dd = 1.0 - smoothstep(0.55, 0.95, length(g));
    col = mix(col, uInk, dd);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

export type Palette = { ink: THREE.Color; paper: THREE.Color; layer: Record<LayerId, THREE.Color> };

export const PATTERN: Record<LayerId, number> = { energy: 1, damp: 2, safety: 3, space: 4, condition: 5 };

function engrave(pal: Palette, section: boolean, layer: LayerId | null, px: number) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    uniforms: {
      uInk: { value: pal.ink },
      uPaper: { value: pal.paper },
      uOverlay: { value: layer ? pal.layer[layer] : pal.ink },
      uLight: { value: new THREE.Vector3(-0.32, 0.5, 0.8) },
      uPx: { value: px },
      uSection: { value: section ? 1 : 0 },
      uPattern: { value: layer ? PATTERN[layer] : 0 },
      uAmount: { value: 0 },
      uHover: { value: 0 },
    },
  });
}

/* ——— House ——— */

export type HouseFeatureBinding = { feature: string; layer: LayerId };

export type House = {
  root: THREE.Group;
  /** Meshes per feature (for raycasting, hover, overlay). */
  meshes: Map<string, THREE.Mesh[]>;
  /** Shader materials per feature (overlay + hover uniforms). */
  materials: Map<string, THREE.ShaderMaterial[]>;
  /** Every edge set, in drawing order (for the plotter draw-in). */
  edges: THREE.LineSegments[];
  /** Annotation anchors (world space, before any explode offset). */
  anchors: Map<string, THREE.Vector3>;
  /** Groups that move when a layer is opened. */
  roof: THREE.Group;
  setPixelRatio: (px: number) => void;
  dispose: () => void;
};

export function buildHouse(pal: Palette, bindings: HouseFeatureBinding[], px: number): House {
  const root = new THREE.Group();
  const roof = new THREE.Group();
  const body = new THREE.Group();
  root.add(body, roof);

  const meshes = new Map<string, THREE.Mesh[]>();
  const materials = new Map<string, THREE.ShaderMaterial[]>();
  const edges: THREE.LineSegments[] = [];
  const lineMat = new THREE.LineBasicMaterial({ color: pal.ink });
  const allMats: THREE.Material[] = [lineMat];
  const allGeo: THREE.BufferGeometry[] = [];
  const layerOf = new Map(bindings.map((b) => [b.feature, b.layer]));

  const baseMat = engrave(pal, false, null, px);
  const sectionMat = engrave(pal, true, null, px);
  allMats.push(baseMat, sectionMat);
  const featureMat = (feature: string, section = false) => {
    const list = materials.get(feature) ?? [];
    const found = list.find((m) => (m.uniforms.uSection!.value as number) === (section ? 1 : 0));
    if (found) return found;
    const m = engrave(pal, section, layerOf.get(feature) ?? null, px);
    list.push(m);
    materials.set(feature, list);
    allMats.push(m);
    return m;
  };

  const addMesh = (geo: THREE.BufferGeometry, parent: THREE.Group, opts: { feature?: string; section?: boolean; edges?: boolean } = {}) => {
    allGeo.push(geo);
    const mat = opts.feature ? featureMat(opts.feature, opts.section) : opts.section ? sectionMat : baseMat;
    const mesh = new THREE.Mesh(geo, mat);
    if (opts.feature) {
      mesh.userData.feature = opts.feature;
      const list = meshes.get(opts.feature) ?? [];
      list.push(mesh);
      meshes.set(opts.feature, list);
    }
    parent.add(mesh);
    if (opts.edges !== false) {
      const eg = new THREE.EdgesGeometry(geo, 25);
      allGeo.push(eg);
      const line = new THREE.LineSegments(eg, lineMat);
      line.position.copy(mesh.position);
      line.rotation.copy(mesh.rotation);
      parent.add(line);
      edges.push(line);
    }
    return mesh;
  };

  const box = (
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z0: number,
    z1: number,
    parent = body,
    opts: { feature?: string; section?: boolean; edges?: boolean } = {},
  ) => {
    const geo = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
    geo.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return addMesh(geo, parent, opts);
  };

  const lines = (pts: number[], parent = body) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    allGeo.push(geo);
    const seg = new THREE.LineSegments(geo, lineMat);
    parent.add(seg);
    edges.push(seg);
    return seg;
  };

  /* Dimensions (metres): footprint x ±3, z ±4; floors at 0, 2.7, 5.3; ridge 7.9 */
  const W = 3;
  const D = 4;
  const T = 0.3; // wall
  const F1 = 2.7;
  const F2 = 5.3;
  const RIDGE = 7.9;
  const CUTX = -0.2; // front wall ends here (x > CUTX is cut away)
  const CUTZ = -3.3; // right wall is a short stub at the rear corner (z > CUTZ is cut away)

  // Ground: earth section under the house, and the slab.
  box(-W - 0.6, W + 0.6, -0.5, -0.15, -D - 0.6, D + 0.6, body, { section: true });
  box(-W, W, -0.15, 0, -D, D);
  // Damp-proof course line on the exterior.
  lines([-W, 0.15, D + 0.002, CUTX, 0.15, D + 0.002, W + 0.002, 0.15, -D, W + 0.002, 0.15, CUTZ]);

  // Party wall (left) and back wall, full height.
  box(-W, -W + T, 0, F2, -D, D, body, { feature: "fabric" });
  box(-W, W, 0, F2, -D, -D + T, body, { feature: "fabric" });
  // Right wall: rear-corner stub only, so the kitchen and bathroom read from the camera side.
  box(W - T, W, 0, F2, -D, CUTZ, body, { feature: "fabric" });
  // Front wall: left part, with door and windows (built around openings).
  const fz0 = D - T;
  const fz1 = D;
  box(-W, -2.4, 0, F2, fz0, fz1, body, { feature: "fabric" }); // pier left of door
  box(-2.4, -1.5, 2.1, F2, fz0, fz1, body, { feature: "fabric" }); // over door
  box(-1.5, CUTX, 0, 0.9, fz0, fz1, body, { feature: "fabric" }); // under ground window
  box(-1.5, CUTX, 2.1, 3.4, fz0, fz1, body, { feature: "fabric" }); // between windows
  box(-1.5, CUTX, 4.6, F2, fz0, fz1, body, { feature: "fabric" }); // over first window
  box(-2.4, -1.5, 2.1, 3.4, fz0, fz1, body, { feature: "fabric" });
  box(-2.4, -1.5, 4.6, F2, fz0, fz1, body, { feature: "fabric" });
  box(-2.4, -1.5, 3.4, 4.6, fz0, fz1, body, { feature: "fabric" });
  // Cut faces of the front and right walls (section hatching), with the cavity between the leaves.
  box(CUTX, CUTX + 0.02, 0, F2, fz0, fz1, body, { section: true, edges: false });
  box(W - T, W, 0, F2, CUTZ, CUTZ + 0.02, body, { section: true, edges: false });
  box(CUTX - 0.01, CUTX + 0.03, 0.15, F2, fz0 + 0.1, fz0 + 0.2, body, { feature: "walls" });
  box(W - 0.2, W - 0.1, 0.15, F2, CUTZ - 0.01, CUTZ + 0.03, body, { feature: "walls" });
  // Windows: frames + double panes (glazing).
  const windowFront = (x0: number, x1: number, y0: number, y1: number) => {
    box(x0, x1, y0, y0 + 0.08, fz0, fz1 + 0.04); // sill
    box(x0 + 0.04, x1 - 0.04, y0 + 0.08, y1, fz0 + 0.12, fz0 + 0.15, body, { feature: "glazing" });
    box(x0 + 0.04, x1 - 0.04, y0 + 0.08, y1, fz0 + 0.18, fz0 + 0.21, body, { feature: "glazing" });
    lines([(x0 + x1) / 2, y0 + 0.08, fz1 + 0.01, (x0 + x1) / 2, y1, fz1 + 0.01]);
  };
  windowFront(-1.5, CUTX, 0.9, 2.1);
  windowFront(-2.4, -1.5, 3.4, 4.6);
  windowFront(-1.5, CUTX, 3.4, 4.6);
  // Front door.
  box(-2.35, -1.55, 0, 2.05, fz0 + 0.05, fz0 + 0.12);
  // Back windows (seen from inside): kitchen and bathroom.
  box(0.6, 2.0, 1.0, 2.1, -D + T - 0.005, -D + T + 0.02, body, { feature: "glazing" });
  box(0.9, 1.9, 3.6, 4.5, -D + T - 0.005, -D + T + 0.02, body, { feature: "glazing" });

  // Floors.
  box(-W + T, W - T, F1 - 0.2, F1, -D + T, 1.0); // first floor, back of stair opening
  box(-1.7, W - T, F1 - 0.2, F1, 1.0, D - T); // first floor, front (beside stair)
  box(-W + T, W - T, F2 - 0.1, F2 + 0.05, -D + T, D - T); // loft floor / ceiling
  // Partitions: front/back rooms on both floors (cut back to the cutaway line so the kitchen and
  // bathroom read); bathroom on the first floor.
  box(-W + T, CUTX, 0, F1 - 0.2, -0.05, 0.05);
  box(-1.7, CUTX, F1, F2 - 0.1, -0.05, 0.05);
  box(CUTX, CUTX + 0.02, 0, F1 - 0.2, -0.05, 0.05, body, { section: true, edges: false });
  box(-0.05, 0.05, F1, F2 - 0.1, -D + T, -0.05);

  // Room floors (space layer): living room, kitchen, front bedroom, back bedroom, bathroom.
  box(-1.7, W - T, 0.001, 0.02, 0.05, D - T, body, { feature: "rooms", edges: false });
  box(-W + T, W - T, 0.001, 0.02, -D + T, -0.05, body, { feature: "rooms", edges: false });
  box(-1.7, W - T, F1 + 0.001, F1 + 0.02, 0.05, D - T, body, { feature: "rooms", edges: false });
  box(-W + T, -0.05, F1 + 0.001, F1 + 0.02, -D + T, -0.05, body, { feature: "rooms", edges: false });
  box(0.05, W - T, F1 + 0.001, F1 + 0.02, -D + T, -0.05, body, { feature: "rooms", edges: false });

  // Stair (safety: falls), rising front to back along the party wall.
  const steps = 13;
  for (let i = 0; i < steps; i++) {
    const z1 = 3.0 - i * 0.28;
    box(-W + T, -1.75, 0, ((i + 1) * F1) / steps, z1 - 0.28, z1, body, { feature: "hazards" });
  }
  // Kitchen: cooker (fire) and consumer unit; smoke alarm on the landing ceiling.
  box(-1.2, -0.5, 0, 0.9, -D + T, -D + T + 0.6, body, { feature: "hazards" });
  box(-2.6, -2.2, 1.6, 2.0, 3.35, 3.45, body, { feature: "hazards" });
  const alarm = new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16);
  alarm.translate(-1.0, F2 - 0.14, 1.5);
  addMesh(alarm, body, { feature: "hazards" });

  // Heating: boiler on the kitchen wall, radiators, flow and return.
  box(2.0, 2.55, 1.3, 2.2, -D + T, -D + T + 0.35, body, { feature: "boiler" });
  box(0.7, 1.9, 0.25, 0.85, -D + T, -D + T + 0.08, body, { feature: "boiler" });
  box(-1.4, 0.4, 0.2, 0.8, D - T - 0.1, D - T, body, { feature: "boiler" });
  box(1.0, 1.8, F1 + 0.25, F1 + 0.85, -D + T, -D + T + 0.08, body, { feature: "boiler" });
  lines([
    2.2,
    1.3,
    -D + T + 0.05,
    2.2,
    0.3,
    -D + T + 0.05,
    2.2,
    0.3,
    -D + T + 0.05,
    1.9,
    0.3,
    -D + T + 0.05,
    2.35,
    2.2,
    -D + T + 0.05,
    2.35,
    F1 + 0.5,
    -D + T + 0.05,
    2.35,
    F1 + 0.5,
    -D + T + 0.05,
    1.8,
    F1 + 0.5,
    -D + T + 0.05,
  ]);

  // Damp: lower interior walls of the back wall and party wall; bathroom corner (condensation).
  box(-W + T, W - T, 0.02, 0.6, -D + T + 0.002, -D + T + 0.012, body, { feature: "damp", edges: false });
  box(-W + T + 0.002, -W + T + 0.012, 0.02, 0.6, -D + T, 0.8, body, { feature: "damp", edges: false });
  box(2.0, W - T - 0.002, F2 - 0.9, F2 - 0.12, -D + T + 0.002, -D + T + 0.012, body, { feature: "damp", edges: false });

  // Loft insulation mat (energy).
  box(-W + T, W - T, F2 + 0.05, F2 + 0.28, -D + T, D - T, body, { feature: "loft" });

  // Roof (lifts when energy or space is opened): back slope full, front slope left part only.
  const slope = (front: boolean, x0: number, x1: number) => {
    const run = D + 0.3;
    const rise = RIDGE - F2;
    const len = Math.hypot(run, rise);
    const geo = new THREE.BoxGeometry(x1 - x0, 0.14, len);
    const ang = Math.atan2(rise, run);
    const mesh = addMesh(geo, roof, { feature: "fabric", edges: true });
    mesh.position.set((x0 + x1) / 2, F2 + rise / 2 + 0.07, front ? run / 2 : -run / 2);
    mesh.rotation.x = front ? ang : -ang;
    // edges were added at origin; move them with the mesh
    const e = edges[edges.length - 1]!;
    e.position.copy(mesh.position);
    e.rotation.copy(mesh.rotation);
    // tile courses
    const tiles: number[] = [];
    for (let s = 0.7; s < len - 0.1; s += 0.7) {
      const zz = front ? D + 0.3 - (s / len) * run : -(D + 0.3) + (s / len) * run;
      const yy = F2 + (s / len) * rise + 0.16;
      tiles.push(x0, yy, zz, x1, yy, zz);
    }
    lines(tiles, roof);
  };
  slope(false, -W - 0.2, W + 0.2);
  slope(true, -W - 0.2, CUTX);
  // Gables (extruded triangles): left full, right back half.
  // Shape x becomes world −z after rotateY(π/2): the half gable uses x ∈ [0, D] so it lands at the back (z < 0).
  const gable = (x: number, full: boolean) => {
    const sh = new THREE.Shape();
    const x0 = full ? -D : 0;
    sh.moveTo(x0, F2);
    sh.lineTo(D, F2);
    sh.lineTo(0, RIDGE - 0.05);
    sh.lineTo(x0, F2);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false });
    geo.rotateY(Math.PI / 2);
    geo.translate(x, 0, 0);
    addMesh(geo, roof, { feature: "fabric" });
  };
  gable(-W, true);
  // Chimney stack on the party wall.
  box(-W, -W + 0.7, RIDGE - 0.9, RIDGE + 1.0, -0.4, 0.4, roof, { feature: "fabric" });
  box(-W + 0.12, -W + 0.32, RIDGE + 1.0, RIDGE + 1.3, -0.15, 0.05, roof);
  box(-W + 0.4, -W + 0.6, RIDGE + 1.0, RIDGE + 1.3, -0.15, 0.05, roof);

  const anchors = new Map<string, THREE.Vector3>([
    ["rating", new THREE.Vector3(-2.0, 5.0, D + 0.05)],
    ["loft", new THREE.Vector3(1.4, F2 + 0.3, 1.6)],
    ["walls", new THREE.Vector3(CUTX + 0.02, 1.7, D - 0.15)],
    ["glazing", new THREE.Vector3(-0.85, 4.0, D + 0.05)],
    ["boiler", new THREE.Vector3(2.27, 1.75, -D + T + 0.36)],
    ["damp", new THREE.Vector3(1.2, 0.3, -D + T + 0.02)],
    ["hazards", new THREE.Vector3(-2.2, 1.6, 0.9)],
    ["rooms", new THREE.Vector3(0.9, F1 + 0.05, 3.0)],
    ["fabric", new THREE.Vector3(1.6, 6.7, -2.0)],
  ]);

  return {
    root,
    meshes,
    materials,
    edges,
    anchors,
    roof,
    setPixelRatio: (v: number) => {
      for (const m of allMats) if (m instanceof THREE.ShaderMaterial) m.uniforms.uPx!.value = v;
    },
    dispose: () => {
      allGeo.forEach((g) => g.dispose());
      allMats.forEach((m) => m.dispose());
    },
  };
}
