"use client";

import { motion, useReducedMotion } from "motion/react";

export function RevealStagger({ 
  children, 
  className = "",
  as: Component = "div",
}: { 
  children: React.ReactNode[];
  className?: string;
  as?: any;
}) {
  const reduce = useReducedMotion();
  const MotionComponent = motion.create ? motion.create(Component as any) : motion(Component as any);
  
  return (
    <Component className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={reduce ? {} : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{
            duration: 0.6,
            delay: i * 0.08,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative h-full"
        >
          {child}
        </motion.div>
      ))}
    </Component>
  );
}

export function RevealFade({ 
  children, 
  className = "",
  delay = 0 
}: { 
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={reduce ? {} : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
