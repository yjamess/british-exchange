"use client";

import dynamic from "next/dynamic";

/** MapLibre + deck.gl touch WebGL and window at import — load them in the browser only. */
export const MapsLabClient = dynamic(() => import("./MapsLab").then((m) => m.MapsLab), { ssr: false });
