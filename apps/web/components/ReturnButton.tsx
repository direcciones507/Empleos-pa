export function ReturnButton({href='/',label='Volver a Empleos.pa'}:{href?:string;label?:string}){
  return <a className="returnButton" href={href}><span aria-hidden="true">←</span>{label}</a>;
}
