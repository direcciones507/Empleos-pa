"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Revela su contenido al entrar en pantalla. Sin JS o con reduced-motion,
// el contenido queda visible: solo se "arma" (oculta) cuando la animación va a correr.
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
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) return;

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

