'use client';

import { motion } from 'framer-motion';

/** Entrada suave quando a seção aparece na tela. `once` porque conteúdo que
 *  reanima a cada rolagem cansa — e quem já leu não precisa ver de novo.
 *  Respeita "reduzir movimento" do sistema por conta do framer-motion. */
export default function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
