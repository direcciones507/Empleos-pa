import type { CSSProperties } from "react";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./home-motion.css";
import HomeReveal from "../components/HomeReveal";

const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--hm-font-display",
  display: "swap",
});

const bodyFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--hm-font-body",
  display: "swap",
});

const TRADES = [
  "Electricista",
  "Abogado",
  "Plomero",
  "Albañil",
  "Técnico",
  "Mecánico",
  "Pintor",
  "Contador",
  "Carpintero",
  "Soldador",
];

const HEADLINE_WORDS = ["Tu", "próximo", "paso"];

export default function Home() {
  return (
    <main className={`hm-root ${displayFont.variable} ${bodyFont.variable}`}>
      {/* (1) Barra superior con shimmer */}
      <div className="hm-topbar">
        <strong>CREA TU CURRÍCULUM PROFESIONAL</strong>
        <span>Genera tu CV gratis en PDF</span>
        <span>Completa tu perfil en minutos · Dos generaciones gratuitas</span>
        <a href="/registro?tipo=candidato" aria-label="Crear mi currículo">
          Crear mi currículo
        </a>
      </div>

      {/* (2) Nav sticky de vidrio oscuro */}
      <nav className="hm-nav" aria-label="Navegación principal">
        <a className="hm-brand" href="/">
          <span className="hm-dot" aria-hidden="true" />
          <span>
            Empleos<b>.pa</b>
          </span>
        </a>
        <div className="hm-navlinks hm-desk">
          <a href="/sobre">Cómo funciona</a>
          <a href="/planes">Planes</a>
          <a href="/contacto">Contacto</a>
          <a className="hm-navghost" href="/login">
            Ingresar
          </a>
          <a className="hm-navcta" href="/registro?tipo=candidato">
            Crear cuenta
          </a>
        </div>
        <details className="hm-menu">
          <summary aria-label="Abrir menú de navegación">
            <span aria-hidden="true">☰</span>
          </summary>
          <div className="hm-menu-links">
            <a href="/login">Ingresar</a>
            <a href="/registro?tipo=candidato">Crear cuenta</a>
            <a href="/sobre">Cómo funciona</a>
            <a href="/planes">Planes</a>
            <a href="/contacto">Contacto</a>
          </div>
        </details>
      </nav>

      {/* (3) Hero */}
      <section className="hm-hero">
        <div
          className="hm-hero-photo"
          role="img"
          aria-label="Vista panorámica de Ciudad de Panamá desde el waterfront"
        />
        <div className="hm-blob hm-blob--a" aria-hidden="true" />
        <div className="hm-blob hm-blob--b" aria-hidden="true" />

        <div className="hm-hero-grid">
          <div>
            <p className="hm-eyebrow">EMPLEO Y TALENTO EN PANAMÁ</p>
            <h1 className="hm-h1">
              {HEADLINE_WORDS.map((w, i) => (
                <span
                  key={w}
                  className="hm-word"
                  style={{ "--i": i } as CSSProperties}
                >
                  {w}{" "}
                </span>
              ))}
              <span className="hm-mark">
                <span className="hm-word" style={{ "--i": 3 } as CSSProperties}>
                  empieza{" "}
                </span>
                <span className="hm-word" style={{ "--i": 4 } as CSSProperties}>
                  aquí.
                </span>
              </span>
            </h1>
            <p className="hm-lead">Encuentra oportunidades. Conecta con talento.</p>
            <div className="hm-ctas">
              <a className="hm-btn hm-btn--lime" href="/registro?tipo=candidato">
                Busco empleo <span aria-hidden="true">→</span>
              </a>
              <a className="hm-btn hm-btn--ghost" href="/registro?tipo=empresa">
                Busco personal <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>

          <div className="hm-visual" aria-hidden="true">
            <div className="hm-card hm-card--profile">
              <small>Perfil</small>
              <strong>Perfil activo</strong>
              <p>Experiencia y disponibilidad al día.</p>
              <div className="hm-tags">
                <span>Experiencia</span>
                <span>Disponible</span>
              </div>
            </div>
            <div className="hm-line" />
            <div className="hm-card hm-card--vacancy">
              <small>Vacante</small>
              <strong>Solicitud de empleo</strong>
              <p>Puesto, ubicación y requisitos.</p>
              <div className="hm-tags">
                <span>Requisitos</span>
                <span>Ubicación</span>
              </div>
            </div>
            <div className="hm-ring-wrap">
              <div className="hm-ring" />
              <div className="hm-ring-fill" />
              <div className="hm-check">✓</div>
            </div>
            <div className="hm-tag-compat">Ejemplo de compatibilidad</div>
          </div>
        </div>
      </section>

      {/* (4) Cinta infinita de oficios */}
      <div className="hm-marquee" aria-label="Oficios y profesiones">
        <div className="hm-marquee-track">
          <ul>
            {TRADES.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <ul aria-hidden="true">
            {TRADES.map((t) => (
              <li key={`dup-${t}`}>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* (5) Rutas: Busco empleo / Busco personal */}
      <HomeReveal>
        <section className="hm-section" aria-label="Elige tu camino">
          <div className="hm-wrap">
            <div className="hm-paths">
              <div className="hm-glow">
                <article className="hm-path">
                  <div className="hm-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
                    </svg>
                  </div>
                  <h3>Busco empleo</h3>
                  <p>
                    Regístrate gratis, completa tu experiencia, habilidades y disponibilidad. Actualiza tu perfil para que las empresas puedan encontrarte cuando busquen candidatos con requisitos compatibles.
                  </p>
                  <a className="hm-btn hm-btn--dark" href="/registro?tipo=candidato">
                    Crear mi perfil <span aria-hidden="true">→</span>
                  </a>
                </article>
              </div>
              <div className="hm-glow">
                <article className="hm-path">
                  <div className="hm-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="9" cy="8" r="3" />
                      <circle cx="17" cy="9" r="2.5" />
                      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M14 15.5a4.5 4.5 0 0 1 6.5 4" />
                    </svg>
                  </div>
                  <h3>Busco personal</h3>
                  <p>
                    Publica una vacante con el puesto, la ubicación y los requisitos. Empleos.pa identifica perfiles activos compatibles y prepara una preselección con análisis de candidatos en tiempo real, para que puedas revisar opciones y decidir a quién entrevistar.
                  </p>
                  <a className="hm-btn hm-btn--dark" href="/registro?tipo=empresa">
                    Solicitar candidatos <span aria-hidden="true">→</span>
                  </a>
                </article>
              </div>
            </div>
          </div>
        </section>
      </HomeReveal>

      {/* (6) Banner lima de promoción */}
      <HomeReveal>
        <section className="hm-section" style={{ paddingTop: 0 }} aria-label="Promoción de lanzamiento para empresas">
          <div className="hm-promo">
            <div>
              <strong>¡50% de descuento por candidato!</strong>
              <span>Promoción de lanzamiento para empresas</span>
            </div>
            <a className="hm-btn hm-btn--dark" href="/registro?tipo=empresa&solicitud=vacante">
              Publicar vacante <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </HomeReveal>

      {/* (7) Ventajas */}
      <HomeReveal>
        <section className="hm-section" style={{ paddingTop: 0 }} aria-label="Ventajas">
          <div className="hm-wrap">
            <div className="hm-perks">
              <article className="hm-perk">
                <b aria-hidden="true">✓</b>
                <h3>Perfiles activos</h3>
                <p>La vigencia ayuda a mantener una base laboral actual.</p>
              </article>
              <article className="hm-perk">
                <b aria-hidden="true">↯</b>
                <h3>Proceso simple</h3>
                <p>Registro y solicitudes pensados para hacerse desde el teléfono.</p>
              </article>
              <article className="hm-perk">
                <b aria-hidden="true">⌕</b>
                <h3>Búsqueda compatible</h3>
                <p>Preselección según los requisitos de cada solicitud.</p>
              </article>
            </div>
          </div>
        </section>
      </HomeReveal>

      {/* (8) Empleo y servicios */}
      <HomeReveal>
        <section className="hm-section hm-services">
          <div className="hm-wrap">
            <p className="hm-kicker">EMPLEO Y SERVICIOS</p>
            <h2 className="hm-h2">Elige exactamente lo que necesitas.</h2>
            <p className="hm-sub">
              Las vacantes de empleo y los servicios eventuales tienen recorridos independientes.
            </p>
            <div className="hm-svc-grid">
              <article className="hm-svc">
                <span>Cliente particular o empresa</span>
                <h3>Necesito un servicio</h3>
                <p>
                  Describe el trabajo que necesitas, dónde y cuándo. Encuentra profesionales u oficios compatibles y revisa las condiciones del servicio antes de solicitar sus datos.
                </p>
                <a className="hm-btn hm-btn--dark" href="/registro?tipo=empresa&returnTo=/empresa/servicios/nuevo">
                  Solicitar servicio <span aria-hidden="true">→</span>
                </a>
              </article>
              <article className="hm-svc">
                <span>Profesionales, técnicos y oficios</span>
                <h3>Ofrezco servicios</h3>
                <p>
                  Ofrece tus servicios como abogado, electricista, albañil, plomero, técnico u otro profesional. Registra tu experiencia, zonas de atención y disponibilidad para aparecer en solicitudes compatibles.
                </p>
                <a className="hm-btn hm-btn--dark" href="/registro?tipo=candidato&returnTo=/servicios/ofrecer">
                  Crear perfil de servicios <span aria-hidden="true">→</span>
                </a>
              </article>
            </div>
          </div>
        </section>
      </HomeReveal>

      {/* (9) Pie */}
      <footer className="hm-foot">
        <div className="hm-foot-brand">Empleos.pa</div>
        <nav aria-label="Navegación del pie de página">
          <a href="/sobre">Sobre Empleos.pa</a>
          <a href="/planes">Planes</a>
          <a href="/privacidad">Privacidad</a>
          <a href="/terminos">Términos</a>
          <a href="/contacto">Contacto</a>
        </nav>
        <nav aria-label="Redes sociales de Empleos.pa">
          <a href="https://www.facebook.com/profile.php?id=61594494911956" target="_blank" rel="noopener noreferrer">
            Facebook
          </a>
          <a href="https://www.instagram.com/empleo.pa/" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a href="https://www.tiktok.com/@empleos.pa" target="_blank" rel="noopener noreferrer">
            TikTok
          </a>
        </nav>
        <p>Encuentra oportunidades. Encuentra talento.</p>
        <p className="hm-copy">© 2026 Empleos.pa. Todos los derechos reservados.</p>
        <p className="hm-copy">Powered by AD507 Technologies</p>
      </footer>
    </main>
  );
}

