"use client";
import { MotionConfig } from "motion/react";
export default function Providers({children}) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
