/** Electric spectrum is adopted; the remaining palettes are design-lab alternatives. */
export const PALETTES = [
  {
    id: "spectrum", name: "Electric spectrum", tag: "Adopted", ground: "#E9F0D9",
    description: "Clear, brighter accents around the electric blue. The widest separation for busy charts.",
    colours: ["#0618F5", "#D66B16", "#00968B", "#D94E98", "#748F12", "#9061DB", "#258DB5", "#C94E3F", "#A78508", "#607DAD", "#4E9168", "#AF5488"],
  },
  {
    id: "mineral", name: "Mineral daylight", tag: "Softer", ground: "#E9E3F3",
    description: "Sea glass, clay and lilac. A quieter set with less visual weight than the current dark accents.",
    colours: ["#0618F5", "#B87832", "#378E89", "#BA668C", "#81933E", "#8776C7", "#CE6854", "#4B91AF", "#AA873A", "#5C7BC0", "#648F73", "#AD6B57"],
  },
  {
    id: "citrus", name: "Citrus & ink", tag: "More vivid", ground: "#F1E6BE",
    description: "Golden yellow, mint and hot pink. A warmer, more playful accent system with the same blue anchor.",
    colours: ["#0618F5", "#B58C00", "#00A187", "#E04687", "#7D65D8", "#D56320", "#008DB4", "#9B8733", "#BD4FBC", "#558B4A", "#DD4850", "#4779BE"],
  },
] as const;
export const CURRENT = ["#0618F5", "#B45F06", "#012169", "#00796B", "#8E2C74"];
export function contrastOnPaper(hex: string) {
  const luminance = (colour: string) => {
    const c = colour.slice(1).match(/../g)!.map(v => {
      const n = parseInt(v, 16) / 255;
      return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
    });
    return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  };
  return (luminance("#FDFDFF") + 0.05) / (luminance(hex) + 0.05);
}
