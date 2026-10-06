"use client";

const EMPLOYMENT_TYPES = [
  ["INDEFINIDO", "Indefinido"],
  ["TEMPORAL", "Temporal"],
  ["OBRA", "Por obra o proyecto"],
  ["DIA_HORA", "Por día u hora"],
  ["EVENTUAL", "Eventual / puntual"],
];
const PERIODS = [["HORA","Por hora"],["QUINCENA","Por quincena"],["MES","Por mes"]];
const SHIFTS = [["DIURNO","Diurno"],["NOCTURNO","Nocturno"],["ROTATIVO","Rotativo"],["FLEXIBLE","Flexible"]];
const JOB_LEVELS = [["OPERATIVO","Operativo"],["TECNICO","Técnico"],["SUPERVISOR","Supervisor"],["GERENCIAL","Gerencial"]];

function toggle(list:any[], value:string){return list.includes(value)?list.filter(x=>x!==value):[...list,value]}
function Field({label,value,onChange,type="text",min}:any){return <label className="wfield">{label}<input type={type} min={min} value={value??""} onChange={e=>onChange(e.target.value)}/></label>}
function Select({label,value,onChange,items}:any){return <label className="wfield">{label}<select value={value??""} onChange={e=>onChange(e.target.value)}><option value="">Selecciona</option>{items.map(([v,l]:string[])=><option key={v} value={v}>{l}</option>)}</select></label>}
function Checks({label,values,onChange,items}:any){const selected=Array.isArray(values)?values:[];return <fieldset className="repeat"><legend>{label}</legend>{items.map(([v,l]:string[])=><label key={v} className="check"><input type="checkbox" checked={selected.includes(v)} onChange={()=>onChange(toggle(selected,v))}/><span>{l}</span></label>)}</fieldset>}

export function CandidateStructuredFields({p,set}:any){
  const schedule=p.schedule_preferences??{};
  const mobility=p.mobility??{};
  return <div className="repeat">
    <h2>Preferencias para encontrar mejores oportunidades</h2>
    <p className="fieldHelp">Estos datos permiten comparar tu perfil con una vacante de forma más precisa. No sustituyen la información que ya escribiste.</p>
    <Field label="Salario mínimo que aceptarías" type="number" min="0" value={p.salary_minimum} onChange={(x:string)=>set("salary_minimum",x===""?null:Number(x))}/>
    <Select label="El salario mínimo es" value={p.salary_period} onChange={(x:string)=>set("salary_period",x||null)} items={PERIODS}/>
    <Checks label="Tipos de contratación que aceptarías" values={p.employment_types} onChange={(x:any)=>set("employment_types",x)} items={EMPLOYMENT_TYPES}/>
    <Select label="Turno preferido" value={schedule.shift} onChange={(x:string)=>set("schedule_preferences",{...schedule,shift:x||null})} items={SHIFTS}/>
    <label className="check"><input type="checkbox" checked={schedule.weekends===true} onChange={e=>set("schedule_preferences",{...schedule,weekends:e.target.checked})}/><span>Puedo trabajar fines de semana</span></label>
    <label className="check"><input type="checkbox" checked={schedule.holidays===true} onChange={e=>set("schedule_preferences",{...schedule,holidays:e.target.checked})}/><span>Puedo trabajar feriados</span></label>
    <label className="check"><input type="checkbox" checked={mobility.own_transport===true} onChange={e=>set("mobility",{...mobility,own_transport:e.target.checked})}/><span>Tengo transporte propio</span></label>
    <label className="check"><input type="checkbox" checked={mobility.can_relocate===true} onChange={e=>set("mobility",{...mobility,can_relocate:e.target.checked})}/><span>Estoy dispuesto/a a reubicarme</span></label>
  </div>
}

export function VacancyStructuredFields({v,set}:any){
  const schedule=v.schedule_structured??{};
  const mobility=v.mobility_requirement??{};
  return <div className="repeat">
    <h2>Condiciones estructuradas de la vacante</h2>
    <p className="fieldHelp">Ayudan a comparar requisitos concretos sin depender únicamente del texto libre.</p>
    <Select label="Tipo de contratación" value={v.employment_type} onChange={(x:string)=>set("employment_type",x||null)} items={EMPLOYMENT_TYPES}/>
    <Field label="Duración estimada, si aplica" value={v.employment_duration} onChange={(x:string)=>set("employment_duration",x)}/>
    <Select label="Nivel del puesto" value={v.job_level} onChange={(x:string)=>set("job_level",x||null)} items={JOB_LEVELS}/>
    <Select label="Turno" value={schedule.shift} onChange={(x:string)=>set("schedule_structured",{...schedule,shift:x||null})} items={SHIFTS}/>
    <label className="check"><input type="checkbox" checked={schedule.weekends===true} onChange={e=>set("schedule_structured",{...schedule,weekends:e.target.checked})}/><span>Incluye fines de semana</span></label>
    <label className="check"><input type="checkbox" checked={schedule.holidays===true} onChange={e=>set("schedule_structured",{...schedule,holidays:e.target.checked})}/><span>Incluye feriados</span></label>
    <Field label="Salario ofrecido desde" type="number" min="0" value={v.salary_minimum} onChange={(x:string)=>set("salary_minimum",x===""?null:Number(x))}/>
    <Field label="Salario ofrecido hasta" type="number" min="0" value={v.salary_maximum} onChange={(x:string)=>set("salary_maximum",x===""?null:Number(x))}/>
    <Select label="Periodicidad del salario" value={v.salary_period} onChange={(x:string)=>set("salary_period",x||null)} items={PERIODS}/>
    <label className="check"><input type="checkbox" checked={v.salary_negotiable===true} onChange={e=>set("salary_negotiable",e.target.checked)}/><span>Salario a convenir / negociable</span></label>
    <Field label="Experiencia mínima (años)" type="number" min="0" value={v.experience_min_years} onChange={(x:string)=>set("experience_min_years",x===""?null:Number(x))}/>
    <Select label="La experiencia debe ser" value={v.experience_scope} onChange={(x:string)=>set("experience_scope",x||null)} items={[["PUESTO","En el mismo puesto"],["SECTOR","En el mismo sector"],["GENERAL","Experiencia laboral general"]]}/>
    <label className="check"><input type="checkbox" checked={mobility.own_transport_required===true} onChange={e=>set("mobility_requirement",{...mobility,own_transport_required:e.target.checked})}/><span>Requiere transporte propio</span></label>
    <label className="check"><input type="checkbox" checked={mobility.travel_required===true} onChange={e=>set("mobility_requirement",{...mobility,travel_required:e.target.checked})}/><span>Requiere desplazarse por trabajo</span></label>
  </div>
}
