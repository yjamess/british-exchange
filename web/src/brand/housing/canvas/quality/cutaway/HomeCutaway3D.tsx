"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { tokenRGB } from "../../../../motion/noise";
import { buildHouse, type House, type Palette } from "./house3d";
import type { Feature, LayerId } from "./features";
import c from "./cutaway.module.css";

/**
 * The engraved 3D cutaway. Orthographic (axonometric) camera, paper ground, ink linework.
 *   Draw-in: edges are plotted line by line on first view.
 *   Idle:    a slow sway, paused off-screen.
 *   Select:  camera eases to the feature, its layer's pattern grows by density, the roof lifts
 *            for loft and space so the inside reads.
 *   Hover:   the feature takes a fixed dot screen; its annotation lifts.
 * Annotations are real buttons projected from 3D anchors: Tab / Enter / arrows select features.
 * Reduced motion: no draw-in, no sway, instant moves. No WebGL: `onUnavailable` (parent shows text).
 */

type Props = {
  features: Feature[];
  /** Formatted value per feature for the annotation ("—" when unavailable). */
  values: Record<string, string>;
  active: string | null;
  onSelect: (id: string) => void;
  /** Called once if WebGL cannot start. */
  onUnavailable?: () => void;
  /** Render one still per feature (for the mobile detail cards). */
  onSnapshots?: (stills: Record<string, string>) => void;
  /** Hide annotations (snapshot-only instance). */
  bare?: boolean;
};

const reduced = () => typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const HOME_TARGET = new THREE.Vector3(0.3, 3.3, 0);
const VIEW_H = 22; // world units visible vertically at zoom 1 — room for the tags around the house
/** Where each annotation tag sits relative to its dot, so tags do not collide. */
const TAG_SIDE: Record<string, "ne" | "nw" | "se" | "sw"> = {
  rating: "nw",
  loft: "ne",
  walls: "sw",
  glazing: "nw",
  boiler: "ne",
  damp: "se",
  hazards: "sw",
  rooms: "sw",
  fabric: "ne",
};
const ROOF_LIFT_FOR = new Set(["loft", "rooms"]);

export function HomeCutaway3D({ features, values, active, onSelect, onUnavailable, onSnapshots, bare = false }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const annRefs = useRef(new Map<string, HTMLButtonElement>());
  const [hovered, setHovered] = useState<string | null>(null);
  const api = useRef<{
    house: House;
    rig: { az: number; el: number; target: THREE.Vector3; zoom: number; lift: number };
    focus: (id: string | null) => void;
    amounts: (active: string | null, hovered: string | null, instant?: boolean) => void;
  } | null>(null);
  const layerOf = useRef(new Map<string, LayerId>(features.map((f) => [f.id, f.layer])));
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: Boolean(onSnapshots) });
    } catch {
      onUnavailable?.();
      return;
    }
    const px = Math.min(2, window.devicePixelRatio || 1);
    renderer.setPixelRatio(px);
    wrap.prepend(renderer.domElement);
    renderer.domElement.className = c.canvas;
    renderer.domElement.setAttribute("aria-hidden", "true");

    const col = (name: string, fb: [number, number, number]) => new THREE.Color(...tokenRGB(wrap, name, fb));
    const pal: Palette = {
      ink: col("--bo-ink", [0.024, 0.094, 0.961]),
      paper: col("--bo-paper", [0.992, 0.992, 1]),
      layer: {
        energy: col("--bo-mustard", [0.659, 0.522, 0.173]),
        damp: col("--bo-lavender", [0.612, 0.62, 1]),
        safety: col("--bo-ink", [0.024, 0.094, 0.961]),
        space: col("--bo-green", [0.337, 0.459, 0.353]),
        condition: col("--bo-union", [0.004, 0.129, 0.412]),
      },
    };
    const scene = new THREE.Scene();
    scene.background = pal.paper;
    const house = buildHouse(
      pal,
      features.map((f) => ({ feature: f.id, layer: f.layer })),
      px,
    );
    scene.add(house.root);

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    const rig = { az: 0.62, el: 0.36, target: HOME_TARGET.clone(), zoom: 1, lift: 0 };
    const sway = { t: 0, paused: false };
    const pause = () => (sway.paused = true);
    const resume = () => (sway.paused = false);
    wrap.addEventListener("pointerenter", pause);
    wrap.addEventListener("pointerleave", resume);
    wrap.addEventListener("focusin", pause);
    wrap.addEventListener("focusout", resume);

    const size = () => {
      const w = wrap.clientWidth || 640;
      const h = wrap.clientHeight || 480;
      renderer.setSize(w, h, false);
      const aspect = w / h;
      camera.left = (-VIEW_H * aspect) / 2;
      camera.right = (VIEW_H * aspect) / 2;
      camera.top = VIEW_H / 2;
      camera.bottom = -VIEW_H / 2;
      camera.updateProjectionMatrix();
    };
    const place = () => {
      const az = rig.az + (reduced() ? 0 : Math.sin(sway.t * 0.12) * 0.1);
      const r = 40;
      camera.position.set(
        rig.target.x + r * Math.cos(rig.el) * Math.sin(az),
        rig.target.y + r * Math.sin(rig.el),
        rig.target.z + r * Math.cos(rig.el) * Math.cos(az),
      );
      camera.zoom = rig.zoom;
      camera.updateProjectionMatrix();
      camera.lookAt(rig.target);
      house.roof.position.y = rig.lift;
    };

    // Plotter draw-in: reveal edge vertices in drawing order.
    const counts = house.edges.map((e) => e.geometry.getAttribute("position")!.count);
    const total = counts.reduce((a, b) => a + b, 0);
    const draw = { p: reduced() ? 1 : 0 };
    const applyDraw = () => {
      let budget = Math.floor(draw.p * total);
      house.edges.forEach((e, i) => {
        const n = Math.min(counts[i]!, Math.max(0, budget));
        e.geometry.setDrawRange(0, n - (n % 2));
        budget -= counts[i]!;
      });
    };
    applyDraw();

    // Annotations follow their anchors.
    const v = new THREE.Vector3();
    const placed: { l: number; t: number; r: number; b: number }[] = [];
    const project = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      placed.length = 0;
      annRefs.current.forEach((el, id) => {
        const a = house.anchors.get(id);
        if (!a) return;
        v.copy(a);
        if (id === "fabric") v.y += rig.lift;
        v.project(camera);
        const x = ((v.x + 1) / 2) * w;
        const y = ((1 - v.y) / 2) * h;
        el.style.transform = `translate(${x}px, ${y}px)`;
        // Keep tags inside the stage: flip sides near an edge (preferred side otherwise).
        const pref = TAG_SIDE[id] ?? "ne";
        const ew = pref[1] === "e" && x > w - 200 ? "w" : pref[1] === "w" && x < 200 ? "e" : pref[1];
        const ns = pref[0] === "n" && y < 60 ? "s" : pref[0] === "s" && y > h - 70 ? "n" : pref[0];
        const side = `${ns}${ew}`;
        if (el.dataset.side !== side) el.dataset.side = side;
        // Nudge tags apart vertically so none hides another (stable order = feature order).
        const tag = el.lastElementChild as HTMLElement | null;
        if (!tag) return;
        const tw = tag.offsetWidth;
        const th = tag.offsetHeight;
        const l = ew === "e" ? x + 12 : x - 12 - tw;
        let t0 = ns === "n" ? y - 30 : y + 10;
        let dy = 0;
        for (let k = 0; k < 24; k++) {
          const hit = placed.some((r) => l < r.r && l + tw > r.l && t0 + dy < r.b && t0 + dy + th > r.t);
          if (!hit) break;
          dy += ns === "n" ? -8 : 8;
        }
        t0 += dy;
        placed.push({ l, t: t0, r: l + tw, b: t0 + th });
        tag.style.translate = dy ? `0 ${dy}px` : "";
      });
    };

    const render = () => {
      place();
      renderer.render(scene, camera);
      project();
    };

    // Picking.
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pickables = [...house.meshes.values()].flat();
    let hoverId: string | null = null;
    const onMove = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickables, false)[0];
      const id = (hit?.object.userData.feature as string | undefined) ?? null;
      if (id !== hoverId) {
        hoverId = id;
        setHovered(id);
        renderer.domElement.style.cursor = id ? "pointer" : "";
      }
    };
    const onLeave = () => {
      hoverId = null;
      setHovered(null);
    };
    const onClick = () => {
      if (hoverId) onSelectRef.current(hoverId);
    };
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);
    renderer.domElement.addEventListener("click", onClick);

    // Overlay density per feature: active 1, same layer 0.45, others 0. Hover: dot screen.
    const amounts = (act: string | null, hov: string | null, instant = false) => {
      const actLayer = act ? layerOf.current.get(act) : undefined;
      house.materials.forEach((mats, id) => {
        const target = id === act ? 1 : actLayer && layerOf.current.get(id) === actLayer ? 0.45 : 0;
        for (const m of mats) {
          const u = m.uniforms.uAmount!;
          if (instant || reduced()) {
            gsap.killTweensOf(u);
            u.value = target;
          } else gsap.to(u, { value: target, duration: 0.6, ease: "power2.out", overwrite: true });
          m.uniforms.uHover!.value = id === hov ? 1 : 0;
        }
      });
    };

    const focus = (id: string | null) => {
      const a = id ? house.anchors.get(id) : null;
      const target = a ? HOME_TARGET.clone().lerp(a, 0.55) : HOME_TARGET.clone();
      const zoom = a ? 1.45 : 1;
      const lift = id && ROOF_LIFT_FOR.has(id) ? 1.9 : 0;
      if (reduced()) {
        rig.target.copy(target);
        rig.zoom = zoom;
        rig.lift = lift;
        return;
      }
      gsap.to(rig.target, { x: target.x, y: target.y, z: target.z, duration: 1.1, ease: "power3.inOut", overwrite: true });
      gsap.to(rig, { zoom, lift, duration: 1.1, ease: "power3.inOut", overwrite: "auto" });
    };

    api.current = { house, rig, focus, amounts };

    size();
    render();

    // Snapshots for the mobile detail cards (one still per feature).
    if (onSnapshots) {
      const stills: Record<string, string> = {};
      const save = { ...rig, target: rig.target.clone() };
      draw.p = 1;
      applyDraw();
      renderer.setSize(480, 320, false);
      const aspect = 480 / 320;
      camera.left = (-VIEW_H * aspect) / 2;
      camera.right = (VIEW_H * aspect) / 2;
      camera.updateProjectionMatrix();
      for (const f of features) {
        const a = house.anchors.get(f.id);
        if (!a) continue;
        rig.target.copy(HOME_TARGET).lerp(a, 0.85);
        rig.zoom = 2.6;
        rig.lift = ROOF_LIFT_FOR.has(f.id) ? 1.9 : 0;
        amounts(f.id, null, true);
        place();
        renderer.render(scene, camera);
        stills[f.id] = renderer.domElement.toDataURL("image/png");
      }
      Object.assign(rig, save);
      amounts(null, null, true);
      size();
      onSnapshots(stills);
    }

    // Loop: sway + draw-in, paused off-screen; reduced motion renders on change only.
    let raf = 0;
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = Boolean(e?.isIntersecting)));
    io.observe(wrap);
    const ro = new ResizeObserver(() => {
      size();
      render();
    });
    ro.observe(wrap);
    const drawTween = reduced() ? null : gsap.to(draw, { p: 1, duration: 2.6, ease: "power1.inOut", delay: 0.15, onUpdate: applyDraw });
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (visible) {
        if (!reduced() && !sway.paused) sway.t += dt;
        render();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      drawTween?.kill();
      gsap.killTweensOf(rig);
      gsap.killTweensOf(rig.target);
      io.disconnect();
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
      renderer.domElement.removeEventListener("click", onClick);
      wrap.removeEventListener("pointerenter", pause);
      wrap.removeEventListener("pointerleave", resume);
      wrap.removeEventListener("focusin", pause);
      wrap.removeEventListener("focusout", resume);
      house.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
    // Scene is built once; props flow in through the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api.current?.focus(active);
  }, [active]);
  useEffect(() => {
    api.current?.amounts(active, hovered);
  }, [active, hovered]);

  // Arrow keys move between annotations.
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(e.key)) return;
    const ids = features.map((f) => f.id);
    const cur = ids.indexOf((document.activeElement as HTMLElement | null)?.dataset.feature ?? "");
    if (cur < 0) return;
    e.preventDefault();
    const next = ids[(cur + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : ids.length - 1)) % ids.length]!;
    annRefs.current.get(next)?.focus();
  };

  return (
    <div className={c.frame}>
      <div ref={wrapRef} className={c.stage} onKeyDown={onKey}>
        {!bare && (
          <div className={c.annotations} role="group" aria-label="Cutaway features">
            {features.map((f) => (
              <button
                key={f.id}
                ref={(el) => {
                  if (el) annRefs.current.set(f.id, el);
                  else annRefs.current.delete(f.id);
                }}
                type="button"
                data-feature={f.id}
                data-layer={f.layer}
                data-side={TAG_SIDE[f.id] ?? "ne"}
                className={c.annotation}
                aria-pressed={active === f.id}
                data-hover={hovered === f.id ? "true" : undefined}
                onClick={() => onSelect(f.id)}
                onPointerEnter={() => setHovered(f.id)}
                onPointerLeave={() => setHovered((h) => (h === f.id ? null : h))}
                onFocus={() => setHovered(f.id)}
                onBlur={() => setHovered((h) => (h === f.id ? null : h))}
              >
                <span className={c.dot} aria-hidden="true" />
                <span className={c.tag}>
                  <span className={c.tagName}>{f.tag}</span>
                  <span className={c.tagValue}>{values[f.id] ?? "—"}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {!bare && <p className={c.stamp}>⌗ Illustrative diagram · not a surveyed property</p>}
    </div>
  );
}
