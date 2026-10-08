// Call with the vacancy row locked. Once an external order exists, its outcome
// must be reconciled without replacing its private delivery snapshot.
export async function selectionObligation(c:any,vacancyId:string){
  const q=await c.query(`select
    exists(select 1 from yappy_payment_orders o where o.vacancy_id=$1 or o.contact_request_id in (select contact_request_id from service_contact_requests where vacancy_id=$1)) as external_order,
    exists(select 1 from vacancy_payments where vacancy_id=$1 and status in ('PENDIENTE','EN_REVISION','APROBADO')) as payment,
    exists(select 1 from vacancy_deliveries where vacancy_id=$1 and status='ENVIADA') as delivered,
    exists(select 1 from service_contact_requests where vacancy_id=$1 and status in ('ACCEPTED_AWAITING_PAYMENT','PAID')) as accepted_service`,[vacancyId]);
  const r=q.rows[0];return Boolean(r.external_order||r.payment||r.delivered||r.accepted_service);
}
export function requestedProfileLimit(v:any){
  const n=Number(v.confirmations?.requested_candidates??Math.min(v.package_candidate_limit??15,15));
  if(!Number.isInteger(n)||n<1||n>15)throw new Error('INVALID_REQUESTED_CANDIDATES');
  return n;
}
