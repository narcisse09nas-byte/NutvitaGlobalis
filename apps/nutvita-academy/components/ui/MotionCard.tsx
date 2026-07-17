"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function MotionCard({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      viewport={{ once: true }}
      whileHover={{ y: -6 }}
      className={cn(
        "rounded-[20px] border border-green-100 bg-white p-6 shadow-sm transition",
        className
      )}
    >
      {children}
    </motion.div>
  );
}