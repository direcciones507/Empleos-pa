// Call inside a transaction while holding the vacancy lock.
export async function hasApprovedVacancyPayment(c: any, v: any) {
  if (v.request_type !== 'VACANTE') return true;
  const yappyOnly = v.confirmations?.candidate_purchase?.version;
  const paid = await c.query(`select payment_id from vacancy_payments where vacancy_id=$1 and status='APROBADO' and amount>=$2
    ${yappyOnly ? "and exists(select 1 from yappy_payment_orders yo where yo.vacancy_id=vacancy_payments.vacancy_id and yo.status='EXECUTED' and yo.amount=vacancy_payments.amount and vacancy_payments.reference='YAPPY:'||yo.yappy_order_id)" : ''} limit 1`, [v.vacancy_id, v.package_price]);
  return Number(v.package_price)>0 && Boolean(paid.rowCount);
}
export async function sendPreparedCandidateDelivery(c: any, v: any) {
  if (!await hasApprovedVacancyPayment(c,v)) throw new Error('PAYMENT_REQUIRED');
  const existing = await c.query("select delivery_id,status from vacancy_deliveries where vacancy_id=$1 order by created_at desc limit 1 for update",[v.vacancy_id]);
  const d=existing.rows[0];
  if (!d) throw new Error('DELIVERY_NOT_PREPARED');
  if (d.status==='ENVIADA') return {delivery_id:d.delivery_id,reused:true};
  if (d.status!=='LISTA') throw new Error('DELIVERY_NOT_READY');
  const count=await c.query('select count(*)::int total from vacancy_delivery_candidates where delivery_id=$1',[d.delivery_id]);
  if (count.rows[0].total!==v.package_candidate_limit) throw new Error('DELIVERY_SNAPSHOT_MISMATCH');
  await c.query(`insert into candidate_notifications(candidate_id,vacancy_id,type,title,message)
    select candidate_id,$2,'PROFILE_DELIVERED','Tu perfil estuvo en una búsqueda',$3 from vacancy_delivery_candidates where delivery_id=$1
    on conflict(candidate_id,vacancy_id,type) do nothing`,[d.delivery_id,v.vacancy_id,`Tu perfil estuvo incluido en una búsqueda para ${v.position} en ${v.work_location}. Una empresa podría contactarte.`]);
  await c.query("update vacancy_candidates set contact_authorized=true where vacancy_id=$1",[v.vacancy_id]);
  await c.query("update vacancy_deliveries set status='ENVIADA',sent_at=now(),updated_at=now() where delivery_id=$1",[d.delivery_id]);
  await c.query("update vacancies set status='ENTREGADA',updated_at=now() where vacancy_id=$1",[v.vacancy_id]);
  return {delivery_id:d.delivery_id,reused:false};
}
