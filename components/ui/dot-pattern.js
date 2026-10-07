"use client";
// Adapted from Magic UI Dot Pattern: static SVG tiling avoids random client
// values, resize listeners and hundreds of animated nodes. See THIRD_PARTY_NOTICES.md.
import { useId } from "react";
import { cn } from "../../lib/utils";
export function DotPattern({width=16,height=16,x=0,y=0,cx=1,cy=1,cr=1,className,...props}) {
  const id=useId();
  return <svg aria-hidden="true" focusable="false" className={cn("pointer-events-none absolute inset-0 size-full",className)} {...props}><defs><pattern id={id} x={x} y={y} width={width} height={height} patternUnits="userSpaceOnUse"><circle cx={cx} cy={cy} r={cr} fill="currentColor" /></pattern></defs><rect width="100%" height="100%" fill={`url(#${id})`} /></svg>;
}
