"use client";

import { memo } from "react";
import { Guilloche } from "@/app/design-lab/observatory/Guilloche";
import { AsciiField } from "@/app/design-lab/imprint/AsciiField";
import p from "./penwork.module.css";

/** Decorative intaglio, isolated from quantitative chart marks. */
export const Penwork = memo(function Penwork({ values, className = "", rings = 32 }: { values: number[]; className?: string; rings?: number }) {
  return <div className={`${p.penwork} ${className}`} aria-hidden="true"><Guilloche values={values} ink="currentColor" rings={rings}/></div>;
});

export function EngravedFigure({values,value,period}: {values:number[];value:string;period:string}) {
  return <div className={p.medallion}>
    <div className={p.registration} aria-hidden="true"><span>+</span><span>+</span><span>+</span><span>+</span></div>
    <span className={p.edition}>Housing / The affordability record</span>
    <Penwork values={values} className={p.rosette}/>
    <div className={p.seal}><span className={p.sealLabel}>A home costs</span><strong>{value}</strong><span className={p.sealLabel}>median annual earnings</span><span className={p.period}>England · {period}</span></div>
    <span className={p.plateNote}>ONS / median price to workplace earnings</span>
    <div className={p.postcard} aria-hidden="true"><div className={p.postcardTop}><span>BRITISH EXCHANGE</span><span>01</span></div><AsciiField source="terraces" fg="#2521b7" accent="#2521b7" bg="#efeee5" cell={4} motion={false} lens={false} className={p.postcardArt}/><span className={p.postcardCaption}>THE PLACES WE CALL HOME</span></div>
  </div>;
}

/** A continuous engraved ribbon for margins; it encodes no data. */
export function EngravedRibbon({ className = "" }: {className?:string}) {
  return <svg className={`${p.ribbon} ${className}`} viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth=".5">{Array.from({length:28},(_,i)=>{
    const f=i/27;
    return <path key={i} d={`M-20 ${30+f*55} C180 ${-35+f*75} 230 ${145-f*60} 480 ${70-f*48} S780 ${-55+f*70} 1020 ${42+f*42}`} vectorEffect="non-scaling-stroke"/>;
  })}</g></svg>;
}
