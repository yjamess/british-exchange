/**
 * Tonal sources for the sector emoji — shaded forms, not outlines.
 *
 * Same method as the imprint lab's crown: draw the subject with a real tonal range
 * (lit faces near white, turned faces mid-grey, crevices and cast shadow near black),
 * light from the upper left, background transparent. ScreenEmoji screens it to dots.
 * Every subject is drawn in a 200 × 200 design box.
 */

type Ctx = CanvasRenderingContext2D;

const g = (v: number, a = 1) => {
  const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgba(${c},${c},${c},${a})`;
};
function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, number][]) {
  const gr = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, v]) => gr.addColorStop(o, g(v)));
  return gr;
}
function rad(ctx: Ctx, x: number, y: number, r0: number, x1: number, y1: number, r1: number, stops: [number, number, number?][]) {
  const gr = ctx.createRadialGradient(x, y, r0, x1, y1, r1);
  stops.forEach(([o, v, a]) => gr.addColorStop(o, g(v, a ?? 1)));
  return gr;
}
function poly(ctx: Ctx, pts: [number, number][], fill: string | CanvasGradient) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
function shadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, k = 0.55) {
  ctx.fillStyle = rad(ctx, x, y, 0, x, y, rx, [
    [0, 0.08, k],
    [1, 0.3, 0],
  ]);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.restore();
  ctx.fill();
}

/* ——— Economy: money with wings ——— */
function moneyWithWings(ctx: Ctx) {
  shadow(ctx, 100, 176, 62, 9, 0.45);
  // Wings first, behind the note: four feathers each, root dark, tips lit
  const wing = (side: 1 | -1) => {
    for (let i = 0; i < 4; i += 1) {
      ctx.save();
      ctx.translate(100 + side * 52, 92);
      ctx.rotate(side * (-0.95 + i * 0.32));
      const len = 62 - i * 9;
      ctx.fillStyle = lin(ctx, 0, 0, side * len, 0, [
        [0, 0.16],
        [0.55, 0.55],
        [1, 0.85],
      ]);
      ctx.beginPath();
      ctx.ellipse(side * len * 0.5, 0, len * 0.55, 10 - i, 0, 0, Math.PI * 2);
      ctx.fill();
      // shaft
      ctx.fillStyle = g(0.25);
      ctx.fillRect(side > 0 ? 4 : -len * 0.9, -0.8, len * 0.86, 1.6);
      ctx.restore();
    }
  };
  wing(-1);
  wing(1);
  // The note, tilted, with a lit top edge and a darker lower half
  ctx.save();
  ctx.translate(100, 104);
  ctx.rotate(-0.08);
  ctx.fillStyle = g(0.22);
  ctx.fillRect(-60 + 4, -36 + 5, 120, 72); // thickness / cast edge
  ctx.fillStyle = lin(ctx, 0, -36, 0, 36, [
    [0, 0.96],
    [0.55, 0.8],
    [1, 0.55],
  ]);
  ctx.fillRect(-60, -36, 120, 72);
  ctx.strokeStyle = g(0.45);
  ctx.lineWidth = 2.5;
  ctx.strokeRect(-52, -28, 104, 56);
  // medallion
  ctx.fillStyle = rad(ctx, -8, -10, 2, 0, 0, 26, [
    [0, 1],
    [0.7, 0.72],
    [1, 0.4],
  ]);
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g(0.06);
  ctx.font = "bold 36px Georgia, 'Times New Roman', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("£", 0, 2);
  ctx.restore();
  // speed marks
  ctx.fillStyle = g(0.2);
  for (const [x, w] of [[70, 18], [96, 26], [132, 14]] as const) ctx.fillRect(x, 158, w, 3);
}

/* ——— Energy: high voltage ——— */
function highVoltage(ctx: Ctx) {
  shadow(ctx, 104, 184, 40, 7, 0.4);
  const bolt: [number, number][] = [[118, 12], [48, 112], [94, 112], [74, 188], [154, 80], [106, 80], [118, 12]];
  // extruded side (dark), offset down-right
  ctx.save();
  ctx.translate(9, 7);
  poly(ctx, bolt, g(0.12));
  ctx.restore();
  // lit face: bright upper-left, turning grey to the lower right
  poly(ctx, bolt, lin(ctx, 50, 20, 150, 180, [
    [0, 1],
    [0.45, 0.85],
    [1, 0.5],
  ]));
  // a bevel line catching light
  ctx.strokeStyle = g(1);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(114, 24);
  ctx.lineTo(60, 106);
  ctx.stroke();
  // sparks
  const spark = (x: number, y: number, r: number) =>
    poly(ctx, [[x, y - r], [x + r * 0.35, y], [x, y + r], [x - r * 0.35, y]], g(0.15));
  spark(166, 34, 14);
  spark(182, 62, 9);
  spark(30, 150, 11);
}

/* ——— Housing: house with smoke ——— */
function houseWithSmoke(ctx: Ctx) {
  shadow(ctx, 112, 182, 78, 10, 0.5);
  // side wall (in shade)
  poly(ctx, [[124, 96], [176, 84], [176, 168], [124, 178]], lin(ctx, 124, 0, 176, 0, [[0, 0.42], [1, 0.3]]));
  // front gable (lit)
  poly(ctx, [[30, 100], [77, 56], [124, 96], [124, 178], [30, 170]], lin(ctx, 30, 60, 124, 178, [[0, 0.98], [1, 0.72]]));
  // side roof plane (dark) and its tile courses
  poly(ctx, [[77, 56], [130, 44], [182, 86], [124, 98]], lin(ctx, 90, 44, 170, 96, [[0, 0.5], [1, 0.22]]));
  ctx.strokeStyle = g(0.12);
  ctx.lineWidth = 1.6;
  for (let i = 1; i < 5; i += 1) {
    const t = i / 5;
    ctx.beginPath();
    ctx.moveTo(77 + (124 - 77) * t, 56 + (98 - 56) * t);
    ctx.lineTo(130 + (182 - 130) * t, 44 + (86 - 44) * t);
    ctx.stroke();
  }
  // bargeboard catching light
  ctx.strokeStyle = g(1);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(26, 103);
  ctx.lineTo(77, 55);
  ctx.lineTo(126, 98);
  ctx.stroke();
  // chimney
  poly(ctx, [[140, 30], [152, 28], [152, 66], [140, 68]], g(0.85));
  poly(ctx, [[152, 28], [162, 30], [162, 72], [152, 66]], g(0.35));
  poly(ctx, [[138, 26], [164, 26], [164, 32], [138, 32]], g(0.2));
  // door and windows (dark recesses with a glint)
  ctx.fillStyle = g(0.12);
  ctx.fillRect(64, 132, 24, 42);
  ctx.fillStyle = g(0.7);
  ctx.beginPath();
  ctx.arc(82, 154, 2.4, 0, Math.PI * 2);
  ctx.fill();
  for (const [x, y] of [[40, 112], [96, 112]] as const) {
    ctx.fillStyle = g(0.1);
    ctx.fillRect(x, y, 20, 18);
    ctx.fillStyle = g(0.95);
    ctx.fillRect(x + 2, y + 2, 6, 5);
    ctx.fillStyle = g(0.55);
    ctx.fillRect(x + 9.5, y, 1.6, 18);
    ctx.fillRect(x, y + 8.5, 20, 1.6);
  }
  for (const [x, y] of [[134, 112], [158, 108]] as const) {
    ctx.fillStyle = g(0.08);
    ctx.fillRect(x, y, 12, 18);
  }
  // smoke: lit puffs, fading as they rise
  for (const [x, y, r, a] of [[154, 18, 9, 1], [164, 8, 11, 0.85], [178, 2, 12, 0.6]] as const) {
    ctx.fillStyle = rad(ctx, x - r * 0.4, y - r * 0.4, 1, x, y, r, [[0, 1, a], [0.7, 0.8, a], [1, 0.55, 0]]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ——— People: two people ——— */
function twoPeople(ctx: Ctx) {
  const bust = (cx: number, top: number, s: number, tone: number) => {
    // shoulders
    ctx.fillStyle = rad(ctx, cx - 22 * s, top + 70 * s, 4, cx, top + 96 * s, 64 * s, [
      [0, tone],
      [0.65, tone * 0.62],
      [1, tone * 0.3],
    ]);
    ctx.beginPath();
    ctx.ellipse(cx, top + 118 * s, 50 * s, 58 * s, 0, Math.PI, 0);
    ctx.fill();
    // neck shadow
    ctx.fillStyle = g(0.2);
    ctx.beginPath();
    ctx.ellipse(cx, top + 62 * s, 12 * s, 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // head
    ctx.fillStyle = rad(ctx, cx - 10 * s, top + 22 * s, 2, cx, top + 34 * s, 30 * s, [
      [0, 1],
      [0.6, tone * 0.85],
      [1, tone * 0.35],
    ]);
    ctx.beginPath();
    ctx.arc(cx, top + 34 * s, 26 * s, 0, Math.PI * 2);
    ctx.fill();
  };
  // right figure first (behind), waving
  bust(130, 40, 0.92, 0.82);
  ctx.save();
  ctx.translate(168, 112);
  ctx.rotate(-0.55);
  ctx.fillStyle = lin(ctx, 0, 0, 0, -58, [[0, 0.35], [1, 0.92]]);
  ctx.beginPath();
  ctx.ellipse(0, -30, 9, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rad(ctx, -3, -66, 1, 0, -62, 11, [[0, 1], [1, 0.6]]);
  ctx.beginPath();
  ctx.arc(0, -62, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  bust(70, 30, 1, 0.95);
}

/* ——— Government: ballot box ——— */
function ballotBox(ctx: Ctx) {
  shadow(ctx, 108, 184, 82, 10, 0.5);
  // box: top (lit), front (light-mid), side (shade)
  poly(ctx, [[30, 96], [130, 96], [170, 78], [70, 78]], lin(ctx, 30, 78, 170, 96, [[0, 1], [1, 0.84]]));
  poly(ctx, [[30, 96], [130, 96], [130, 176], [30, 176]], lin(ctx, 0, 96, 0, 176, [[0, 0.86], [1, 0.62]]));
  poly(ctx, [[130, 96], [170, 78], [170, 158], [130, 176]], lin(ctx, 130, 0, 170, 0, [[0, 0.4], [1, 0.26]]));
  // lid band
  poly(ctx, [[30, 96], [130, 96], [130, 110], [30, 110]], g(0.55));
  poly(ctx, [[130, 96], [170, 78], [170, 92], [130, 110]], g(0.2));
  // slot
  poly(ctx, [[74, 86], [118, 86], [128, 82], [84, 82]], g(0.04));
  // label plate on the front
  ctx.fillStyle = g(0.98);
  ctx.fillRect(56, 128, 48, 22);
  ctx.fillStyle = g(0.35);
  ctx.fillRect(62, 136, 36, 2.4);
  ctx.fillRect(62, 142, 24, 2.4);
  // ballot paper going in: lit sheet with a folded corner and a cross
  ctx.save();
  ctx.translate(100, 84);
  ctx.rotate(-0.12);
  poly(ctx, [[-20, 0], [-20, -66], [10, -66], [22, -54], [22, 0]], lin(ctx, -20, -66, 22, 0, [[0, 1], [1, 0.8]]));
  poly(ctx, [[10, -66], [10, -54], [22, -54]], g(0.45));
  ctx.strokeStyle = g(0.05);
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-9, -46);
  ctx.lineTo(9, -28);
  ctx.moveTo(9, -46);
  ctx.lineTo(-9, -28);
  ctx.stroke();
  ctx.fillStyle = g(0.3, 0.6);
  ctx.fillRect(-20, -6, 42, 6); // shadow where it enters the slot
  ctx.restore();
}

/* ——— Infrastructure: train ——— */
function train(ctx: Ctx) {
  // rails converge to a vanishing point behind the cab
  ctx.fillStyle = g(0.2);
  poly(ctx, [[58, 200], [70, 200], [94, 150], [90, 150]], g(0.18));
  poly(ctx, [[130, 200], [142, 200], [110, 150], [106, 150]], g(0.18));
  for (let i = 0; i < 4; i += 1) {
    const y = 160 + i * 11;
    const half = 22 + i * 13;
    ctx.fillStyle = g(0.4);
    ctx.fillRect(100 - half, y, half * 2, 3 + i);
  }
  // body: rounded front, lit upper-left
  ctx.fillStyle = rad(ctx, 70, 40, 6, 100, 90, 96, [
    [0, 1],
    [0.55, 0.78],
    [1, 0.38],
  ]);
  ctx.beginPath();
  ctx.moveTo(46, 150);
  ctx.lineTo(46, 46);
  ctx.quadraticCurveTo(48, 18, 100, 16);
  ctx.quadraticCurveTo(152, 18, 154, 46);
  ctx.lineTo(154, 150);
  ctx.closePath();
  ctx.fill();
  // windscreen: dark with a raking glint
  ctx.fillStyle = g(0.08);
  ctx.beginPath();
  ctx.moveTo(60, 84);
  ctx.lineTo(62, 46);
  ctx.quadraticCurveTo(100, 34, 138, 46);
  ctx.lineTo(140, 84);
  ctx.closePath();
  ctx.fill();
  poly(ctx, [[74, 82], [88, 44], [100, 43], [86, 82]], g(0.75));
  // headlights
  for (const x of [72, 128]) {
    ctx.fillStyle = g(0.1);
    ctx.beginPath();
    ctx.arc(x, 116, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rad(ctx, x - 3, 113, 0, x, 116, 9, [[0, 1], [1, 0.75]]);
    ctx.beginPath();
    ctx.arc(x, 116, 8.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // buffer beam
  ctx.fillStyle = lin(ctx, 0, 140, 0, 156, [[0, 0.35], [1, 0.12]]);
  ctx.fillRect(40, 140, 120, 16);
}

/* ——— Regions: map with pin ——— */
function mapWithPin(ctx: Ctx) {
  shadow(ctx, 100, 186, 88, 8, 0.4);
  // three folded panels, alternating light and shade
  poly(ctx, [[14, 120], [66, 102], [66, 176], [14, 194]], lin(ctx, 14, 0, 66, 0, [[0, 0.95], [1, 0.82]]));
  poly(ctx, [[66, 102], [134, 120], [134, 194], [66, 176]], lin(ctx, 66, 0, 134, 0, [[0, 0.5], [1, 0.66]]));
  poly(ctx, [[134, 120], [186, 102], [186, 176], [134, 194]], lin(ctx, 134, 0, 186, 0, [[0, 0.98], [1, 0.84]]));
  // a dotted route across the folds
  ctx.fillStyle = g(0.1);
  const route: [number, number][] = [[28, 172], [44, 162], [58, 158], [74, 150], [90, 154], [104, 146], [114, 136]];
  for (const [x, y] of route) {
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // coast-like contour on the right panel
  ctx.strokeStyle = g(0.45);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(146, 130);
  ctx.bezierCurveTo(166, 136, 150, 156, 172, 168);
  ctx.stroke();
  // pin: cast shadow, cone, then lit sphere
  shadow(ctx, 124, 142, 16, 5, 0.6);
  poly(ctx, [[104, 70], [140, 70], [122, 140]], lin(ctx, 104, 0, 140, 0, [[0, 0.62], [1, 0.18]]));
  ctx.fillStyle = rad(ctx, 112, 44, 2, 122, 58, 32, [
    [0, 1],
    [0.5, 0.75],
    [1, 0.25],
  ]);
  ctx.beginPath();
  ctx.arc(122, 58, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = g(0.15);
  ctx.beginPath();
  ctx.arc(122, 58, 8, 0, Math.PI * 2);
  ctx.fill();
}

/* ——— History: hourglass ——— */
function hourglass(ctx: Ctx) {
  shadow(ctx, 100, 190, 62, 8, 0.5);
  // posts behind the glass (shaded wood)
  for (const x of [46, 148]) {
    ctx.fillStyle = lin(ctx, x, 0, x + 8, 0, [[0, 0.7], [1, 0.3]]);
    ctx.fillRect(x, 26, 8, 150);
  }
  // glass bulbs: pale, with dark edge lines and a highlight streak
  const bulb = (top: boolean) => {
    ctx.beginPath();
    if (top) {
      ctx.moveTo(60, 28);
      ctx.bezierCurveTo(58, 74, 96, 84, 100, 100);
      ctx.bezierCurveTo(104, 84, 142, 74, 140, 28);
    } else {
      ctx.moveTo(60, 172);
      ctx.bezierCurveTo(58, 126, 96, 116, 100, 100);
      ctx.bezierCurveTo(104, 116, 142, 126, 140, 172);
    }
    ctx.closePath();
  };
  for (const top of [true, false]) {
    bulb(top);
    ctx.fillStyle = g(0.9, 0.7);
    ctx.fill();
    ctx.strokeStyle = g(0.3);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  // sand: a little left above, a lit-and-shaded pile below, a falling stream
  ctx.save();
  bulb(true);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, 62, 0, 98, [[0, 0.55], [1, 0.3]]);
  ctx.fillRect(40, 66, 120, 40);
  ctx.restore();
  ctx.save();
  bulb(false);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 70, 130, 130, 172, [[0, 0.72], [1, 0.22]]);
  ctx.beginPath();
  ctx.moveTo(56, 174);
  ctx.quadraticCurveTo(100, 112, 144, 174);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = g(0.3);
  ctx.fillRect(98.8, 98, 2.4, 46);
  // highlight streaks on the glass
  ctx.strokeStyle = g(1);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(70, 36);
  ctx.quadraticCurveTo(70, 62, 84, 76);
  ctx.moveTo(70, 164);
  ctx.quadraticCurveTo(70, 140, 82, 128);
  ctx.stroke();
  // end plates: lit top faces, dark fronts
  for (const y of [14, 172]) {
    ctx.fillStyle = g(0.95);
    ctx.fillRect(34, y, 132, 5);
    ctx.fillStyle = lin(ctx, 0, y + 5, 0, y + 16, [[0, 0.5], [1, 0.15]]);
    ctx.fillRect(34, y + 5, 132, 11);
  }
}

export const TONAL = {
  "money-with-wings": moneyWithWings,
  "high-voltage": highVoltage,
  "house-with-smoke": houseWithSmoke,
  "two-people": twoPeople,
  "ballot-box": ballotBox,
  "train-front": train,
  "map-with-pin": mapWithPin,
  hourglass,
} as const;

export type TonalId = keyof typeof TONAL;

/** Render a source at w × h px (contain, small pad). Transparent background. */
export function renderTonal(id: TonalId, w: number, h: number): ImageData {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const s = Math.min(c.width, c.height) / 200;
  ctx.setTransform(s, 0, 0, s, (c.width - 200 * s) / 2, (c.height - 200 * s) / 2);
  TONAL[id](ctx);
  return ctx.getImageData(0, 0, c.width, c.height);
}
