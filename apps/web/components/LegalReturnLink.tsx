"use client";
export function LegalReturnLink(){function destination(){const p=new URLSearchParams(window.location.search).get("returnTo");return p&&/^\/empresa\/vacantes\/VAC-\d{6}$/.test(p)?p:"/";}return <a className="legalBack" href="/" onClick={e=>{const target=destination();if(target!=="/"){e.preventDefault();window.location.assign(target);}}}>← Volver a Empleos.pa</a>}
