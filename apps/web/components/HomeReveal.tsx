"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Revelado al hacer scroll. Clases usadas en home-motion.css:
//   .hm-reveal            contenedor (siempre visible por defecto)
//   .hm-armed             se añade solo si el JS cargó y no hay prefers-reduced-motion
//   .hm-in                se añade al entrar en pantalla
// Sin JS o con reduced-motion el contenido nunca se oculta.
export default function HomeReveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.classList.add("hm-armed");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("hm-in");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`hm-reveal ${className}`.trim()}>
      {children}
    </div>
  );
}

