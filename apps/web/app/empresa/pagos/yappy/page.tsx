"use client";
import {YappyOperation} from "../../../../components/YappyOperation";
export default function YappyPrueba(){return <main className="portal"><header><a href="/empresa">Empleos.pa</a><span>Prueba Yappy</span></header><section><h1>Prueba de integración</h1><p>Con cobros habilitados, el botón oficial solicita una transacción real de $0.01. La disponibilidad depende de la configuración del servidor.</p><YappyOperation endpoint="/v1/company/payments/yappy/test" amount={0.01}/><a className="portalAction secondaryPortal" href="/empresa">Volver al portal</a></section></main>}
