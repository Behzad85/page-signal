"use client";
// Adapted from Magic UI Number Ticker: stable SSR text, accessible final value,
// cleanup on unmount and explicit reduced-motion support. See THIRD_PARTY_NOTICES.md.
import { useEffect, useRef } from "react";
import { useInView, useMotionValue, useSpring, useReducedMotion } from "motion/react";
import { cn } from "../../lib/utils";

export function NumberTicker({value,startValue=0,direction="up",delay=0,className,decimalPlaces=0,...props}) {
  const reduceMotion=useReducedMotion();
  const ref=useRef(null);
  const motionValue=useMotionValue(direction==="down"?value:startValue);
  const springValue=useSpring(motionValue,{damping:60,stiffness:100});
  const isInView=useInView(ref,{once:true,margin:"0px"});
  useEffect(()=>{
    if(reduceMotion || !isInView) return;
    const timer=setTimeout(()=>motionValue.set(direction==="down"?startValue:value),delay*1000);
    return ()=>clearTimeout(timer);
  },[motionValue,isInView,delay,value,direction,startValue,reduceMotion]);
  useEffect(()=>{
    if(reduceMotion) return;
    return springValue.on("change",latest=>{
      if(ref.current) ref.current.textContent=Intl.NumberFormat("en-US",{minimumFractionDigits:decimalPlaces,maximumFractionDigits:decimalPlaces}).format(Number(latest.toFixed(decimalPlaces)));
    });
  },[springValue,decimalPlaces,reduceMotion]);
  const finalValue=direction==="down"?startValue:value;
  return <span className={cn("inline-block tabular-nums",className)} aria-label={String(finalValue)} {...props}><span ref={ref} aria-hidden="true">{finalValue}</span></span>;
}
