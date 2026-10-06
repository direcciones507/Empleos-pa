"use client";
import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";
import { VacancyStructuredFields } from "../../../components/StructuredMatchingFields";
const steps = ["Empresa", "Vacante", "Requisitos", "Funciones", "Revisar"];
export default function Nueva() {
  const [step, setStep] = useState(0),
    [company, setCompany] = useState<any>({}),
    [v, setV] = useState<any>({ quantity: 1, request_type: "VACANTE" }),
    [msg, setMsg] = useState(""),
    [occupations, setOccupations] = useState<any[]>([]);
  const set = (k: string, x: any) => setV((p: any) => ({ ...p, [k]: x }));
  useEffect(() => {
    const q = String(v.position ?? "").trim();
    if (step !== 1 || q.length < 2) {
      setOccupations([]);
      return;
    }
    const t = setTimeout(
      () =>
        api("/v1/company/occupations?q=" + encodeURIComponent(q))
          .then((x) => setOccupations(x.items ?? []))
          .catch(() => setOccupations([])),
      180,
    );
    return () => clearTimeout(t);
  }, [v.position, step]);
  useEffect(() => {
    const s = new URLSearchParams(location.search).get("solicitud");
    if (s === "eventual" || s === "vacante")
      setV((p: any) => ({ ...p, request_type: s.toUpperCase() }));
    api("/v1/company/profile")
      .then((x) => setCompany(x.company))
      .catch(() => {});
  }, []);
  function companyError(e: any) {
    const field = e?.body?.field;
    const labels: Record<string, string> = {
      name: "Empresa o negocio",
      contact_name: "Persona de contacto",
      email: "Correo de contacto",
      mobile_whatsapp: "Celular / WhatsApp",
      landline_phone: "Teléfono fijo",
      province: "Provincia",
      district: "Distrito",
      corregimiento: "Corregimiento",
    };
    if (e?.body?.error === "COMPANY_INCOMPLETE")
      return field && labels[field]
        ? `Falta completar: ${labels[field]}.`
        : "Falta un dato obligatorio de la empresa. Revisa los campos marcados con *.";
    if (e?.body?.error === "COMPANY_PROFILE_INVALID")
      return field && labels[field]
        ? `Revisa el campo: ${labels[field]}.`
        : "Revisa los datos de la empresa.";
    return "No se pudo guardar el perfil de empresa. Revisa los datos e intenta nuevamente.";
  }
  async function next() {
    setMsg("");
    try {
      if (step === 0) {
        const required = [
          "name",
          "contact_name",
          "email",
          "mobile_whatsapp",
          "province",
          "district",
          "corregimiento",
        ];
        const missing = required.filter(
          (k) => !String(company[k] ?? "").trim(),
        );
        if (missing.length) {
          setMsg("Completa los campos obligatorios marcados con *.");
          return;
        }
        await api("/v1/company/profile", {
          method: "PUT",
          body: JSON.stringify(company),
        });
      }
      setStep((x) => Math.min(4, x + 1));
      if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setMsg(companyError(e));
    }
  }
  async function submit() {
    if (!v.confirm_correct || !v.confirm_terms || !v.confirm_scope) {
      setMsg("Confirma las condiciones antes de registrar la solicitud.");
      return;
    }
    setMsg("Enviando…");
    try {
      const payload = { ...v, quantity: Number(v.quantity || 1) };
      await api("/v1/company/vacancies", {
        method: "POST",
        body: JSON.stringify(
          v.request_type === "EVENTUAL"
            ? { ...payload, package: "EVENTUAL_399" }
            : payload,
        ),
      });
      location.href = "/empresa";
    } catch (e: any) {
      const field = e?.body?.field;
      const labels: Record<string,string> = {position:"Puesto",work_location:"Lugar / referencia del trabajo",province:"Provincia del trabajo",district:"Distrito del trabajo",corregimiento:"Corregimiento del trabajo",schedule:"Horario",skills:"Habilidades / conocimientos",main_functions:"Funciones principales",package:"Plan"};
      setMsg(field ? `Revisa el campo: ${labels[field] ?? field}.` : e?.body?.error === "VACANCY_PACKAGE_REQUIRED" ? "No se pudo aplicar la promoción de lanzamiento. Intenta nuevamente." : "Revisa la información obligatoria.");
    }
  }
  return (
    <main className="wizard">
      <header>
        <a href="/empresa">Empleos.pa</a>
        <span>{step + 1} de 5</span>
      </header>
      <div
        className="progress"
        role="progressbar"
        aria-label="Progreso de la solicitud"
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={step + 1}
      >
        <i style={{ width: `${((step + 1) / 5) * 100}%` }} />
      </div>
      <section>
        <p className="eyebrowDark">{steps[step]}</p>
        {step === 0 && (
          <>
            <h1>Tu empresa</h1>
            <F
              n="Nombre de la empresa *"
              v={company.name}
              f={(x: string) => setCompany({ ...company, name: x })}
            />
            <F
              n="Persona de contacto *"
              v={company.contact_name}
              f={(x: string) => setCompany({ ...company, contact_name: x })}
            />
            <F
              n="Correo de contacto *"
              type="email"
              v={company.email}
              f={(x: string) => setCompany({ ...company, email: x })}
            />
            <F
              n="Celular / WhatsApp *"
              v={company.mobile_whatsapp ?? company.phone}
              f={(x: string) => setCompany({ ...company, mobile_whatsapp: x })}
            />
            <F
              n="Teléfono fijo (opcional)"
              v={company.landline_phone}
              f={(x: string) => setCompany({ ...company, landline_phone: x })}
            />
            <F
              n="Provincia *"
              v={company.province}
              f={(x: string) => setCompany({ ...company, province: x })}
            />
            <F
              n="Distrito *"
              v={company.district}
              f={(x: string) => setCompany({ ...company, district: x })}
            />
            <F
              n="Corregimiento *"
              v={company.corregimiento}
              f={(x: string) => setCompany({ ...company, corregimiento: x })}
            />
          </>
        )}
        {step === 1 && (
          <>
            <h1>¿Qué necesitas?</h1>
            <div className="choice" role="group" aria-label="Tipo de solicitud">
              <button
                aria-pressed={v.request_type === "VACANTE"}
                onClick={() => set("request_type", "VACANTE")}
                className={v.request_type === "VACANTE" ? "on" : ""}
              >
                Contratar personal
              </button>
              <button
                aria-pressed={v.request_type === "EVENTUAL"}
                onClick={() => set("request_type", "EVENTUAL")}
                className={v.request_type === "EVENTUAL" ? "on" : ""}
              >
                Servicios y trabajos eventuales
              </button>
            </div>
            {v.request_type === "EVENTUAL" && (
              <p>
                Para servicios profesionales, técnicos u oficios: abogado,
                contador, diseñador, consultor, electricista, plomería,
                reparaciones, mantenimiento o apoyo temporal. El proceso de
                búsqueda, preselección y entrega de perfiles es el mismo.
              </p>
            )}
            <F
              n={
                v.request_type === "EVENTUAL"
                  ? "Oficio o servicio *"
                  : "Puesto *"
              }
              v={v.position}
              f={(x: string) => set("position", x)}
              list="occupation-suggestions"
              placeholder={
                v.request_type === "EVENTUAL"
                  ? "Ej.: Electricista, abogado, tutor de matemática"
                  : "Ej.: Asistente contable, vendedor, desarrollador"
              }
            />
            <datalist id="occupation-suggestions">
              {occupations.map((o: any) => (
                <option key={o.display_name} value={o.display_name} />
              ))}
            </datalist>
            <p className="fieldHint">
              Escribe el nombre más claro y común del puesto, oficio o
              profesión. Puedes elegir una sugerencia o escribir uno nuevo si no
              aparece.
            </p>
            <F
              n="Cantidad *"
              type="number"
              v={v.quantity}
              f={(x: string) => set("quantity", x)}
            />
            <F
              n="Provincia del trabajo *"
              v={v.province}
              f={(x: string) => set("province", x)}
            />
            <F
              n="Distrito del trabajo *"
              v={v.district}
              f={(x: string) => set("district", x)}
            />
            <F
              n="Corregimiento del trabajo *"
              v={v.corregimiento}
              f={(x: string) => set("corregimiento", x)}
            />
            <F
              n="Lugar / referencia del trabajo *"
              v={v.work_location}
              f={(x: string) => set("work_location", x)}
            />
            <F
              n="Modalidad"
              v={v.modality}
              f={(x: string) => set("modality", x)}
            />
            <F
              n="Horario *"
              v={v.schedule}
              f={(x: string) => set("schedule", x)}
            />
            <F
              n="Fecha estimada de inicio"
              type="date"
              v={v.estimated_start}
              f={(x: string) => set("estimated_start", x)}
            />
          </>
        )}
        {step === 2 && (
          <>
            <h1>Requisitos</h1>
            <VacancyStructuredFields v={v} set={set} />
            <F
              n="Educación mínima"
              v={v.minimum_education}
              f={(x: string) => set("minimum_education", x)}
            />
            <F
              n="Experiencia requerida"
              v={v.experience_requirement}
              f={(x: string) => set("experience_requirement", x)}
            />
            <A
              n="Habilidades / conocimientos *"
              v={v.skills}
              f={(x: string) => set("skills", x)}
            />
            <F
              n="Idiomas"
              v={v.languages}
              f={(x: string) => set("languages", x)}
            />
            <F
              n="Licencia, si aplica"
              v={v.license_requirement}
              f={(x: string) => set("license_requirement", x)}
            />
          </>
        )}
        {step === 3 && (
          <>
            <h1>El trabajo</h1>
            <A
              n="Funciones principales *"
              v={v.main_functions}
              f={(x: string) => set("main_functions", x)}
            />
            <A
              n="Características laborales buscadas"
              v={v.profile_notes}
              f={(x: string) => set("profile_notes", x)}
            />
            <A
              n="Información adicional"
              v={v.additional_info}
              f={(x: string) => set("additional_info", x)}
            />
          </>
        )}
        {step === 4 && (
          <>
            <h1>Revisa y envía</h1>
            <div className="reviewBox">
              <strong>
                {v.position ||
                  (v.request_type === "EVENTUAL"
                    ? "Oficio pendiente"
                    : "Puesto pendiente")}
              </strong>
              <p>
                {v.request_type === "EVENTUAL"
                  ? "Servicio o trabajo eventual"
                  : "Vacante"}{" "}
                · {v.quantity || 1} persona(s) ·{" "}
                {v.work_location || "Ubicación pendiente"}
              </p>
              <p>{v.schedule || "Horario pendiente"}</p>

            </div>
            <div className="infoBox">
              <strong>Promoción de lanzamiento</strong>
              <p>
                Durante el lanzamiento, la solicitud puede continuar sin pago.
                Al registrarla verás inmediatamente el estado asignado.
              </p>
            </div>
            <Check
              n="Confirmo que la información de esta solicitud es correcta."
              v={v.confirm_correct}
              f={(x: boolean) => set("confirm_correct", x)}
            />
            <Check
              n="Acepto los términos y el tratamiento de datos aplicables al servicio."
              v={v.confirm_terms}
              f={(x: boolean) => set("confirm_terms", x)}
            />
            <Check
              n="Entiendo que Empleos.pa realiza búsqueda y preselección; la empresa entrevista, verifica y decide la contratación."
              v={v.confirm_scope}
              f={(x: boolean) => set("confirm_scope", x)}
            />
          </>
        )}
        <p className="saveMsg" role="status" aria-live="polite">
          {msg}
        </p>
        <div className="wizardNav">
          {step > 0 && (
            <button onClick={() => setStep((x) => x - 1)}>Anterior</button>
          )}
          {step < 4 ? (
            <button className="next" onClick={next}>
              Siguiente
            </button>
          ) : (
            <button className="next" onClick={submit}>
              Registrar solicitud
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
function F({ n, v, f, type = "text", list, placeholder }: any) {
  return (
    <label className="wfield">
      {n}
      <input
        type={type}
        value={v ?? ""}
        list={list}
        placeholder={placeholder}
        onChange={(e) => f(e.target.value)}
      />
    </label>
  );
}
function A({ n, v, f }: any) {
  return (
    <label className="wfield">
      {n}
      <textarea rows={4} value={v ?? ""} onChange={(e) => f(e.target.value)} />
    </label>
  );
}
function Check({ n, v, f }: any) {
  return (
    <label className="check">
      <input
        type="checkbox"
        checked={!!v}
        onChange={(e) => f(e.target.checked)}
      />
      <span>{n}</span>
    </label>
  );
}
