import { config } from "./config.js";
import { db } from "./db.js";
import {
  ADMIN_ASSISTANT_MAX_RESPONSE_CHARS,
  ADMIN_ASSISTANT_SYSTEM_PROMPT,
  assertAnswerUsesKnownNumbers,
  type AdminAssistantSnapshot,
  type AdminPeriodMetrics,
  buildAdminAssistantPrompt,
  sanitizeAssistantAnswer,
} from "./admin-assistant-core.js";

type Queryable = { query: (sql: string, values?: unknown[]) => Promise<{ rows: any[] }> };
type ProviderOptions = { fetchFn?: typeof fetch; timeoutMs?: number };

const countBy = (rows: any[], key: string) => Object.fromEntries(rows.map((row) => [String(row[key]), Number(row.total ?? 0)]));
const metric = (row: any): AdminPeriodMetrics => ({
  candidates: Number(row?.candidates ?? 0),
  companies: Number(row?.companies ?? 0),
  vacancy_requests: Number(row?.vacancy_requests ?? 0),
  service_requests: Number(row?.service_requests ?? 0),
  service_providers: Number(row?.service_providers ?? 0),
  approved_revenue: Number(row?.approved_revenue ?? 0),
  deliveries_sent: Number(row?.deliveries_sent ?? 0),
});

export async function buildAdminAssistantSnapshot(queryable: Queryable = db): Promise<AdminAssistantSnapshot> {
  const [periods, candidates, companies, vacancies, payments, deliveries, attention, compare7, compare30, candidateGeo, requestGeo] = await Promise.all([
    queryable.query(`with windows(label,start_at) as (values ('today',current_date::timestamptz),('last_7_days',now()-interval '7 days'),('last_30_days',now()-interval '30 days')) select w.label,(select count(*) from candidate_profiles where created_at>=w.start_at)::int candidates,(select count(*) from companies where created_at>=w.start_at)::int companies,(select count(*) from vacancies where request_type='VACANTE' and created_at>=w.start_at)::int vacancy_requests,(select count(*) from vacancies where request_type='EVENTUAL' and created_at>=w.start_at)::int service_requests,(select count(*) from service_provider_profiles where created_at>=w.start_at)::int service_providers,(select coalesce(sum(amount),0) from vacancy_payments where status='APROBADO' and created_at>=w.start_at)::numeric(12,2) approved_revenue,(select count(*) from vacancy_deliveries where status='ENVIADA' and sent_at>=w.start_at)::int deliveries_sent from windows w`),
    queryable.query("select status,count(*)::int total from candidate_profiles group by status"),
    queryable.query("select count(*)::int total from companies"),
    queryable.query("select status,count(*)::int total from vacancies group by status"),
    queryable.query("select status,count(*)::int total from vacancy_payments group by status"),
    queryable.query("select status,count(*)::int total from vacancy_deliveries group by status"),
    queryable.query(`select (select count(*) from vacancy_payments p join vacancies v on v.vacancy_id=p.vacancy_id where p.status='EN_REVISION' and v.status='PAGO_EN_REVISION')::int payments_pending_review,(select count(*) from vacancies where status='APROBADA')::int approved_waiting_search,(select count(*) from vacancy_deliveries where status='LISTA')::int deliveries_waiting_send,(select count(*) from candidate_profiles where status='ACTIVO' and valid_until between current_date and current_date+interval '7 days')::int candidates_expiring_7_days`),
    comparisonQuery(queryable, 7),
    comparisonQuery(queryable, 30),
    queryable.query(`select coalesce(nullif(trim(province),''),'Sin provincia') province,coalesce(nullif(trim(district),''),'Sin distrito') district,count(*)::int candidates from candidate_profiles where created_at>=now()-interval '30 days' group by 1,2 order by candidates desc,1,2 limit 20`),
    queryable.query(`select coalesce(nullif(trim(coalesce(v.province,c.province)),''),'Sin provincia') province,coalesce(nullif(trim(coalesce(v.district,c.district)),''),'Sin distrito') district,count(*) filter (where v.request_type='VACANTE')::int vacancies,count(*) filter (where v.request_type='EVENTUAL')::int services from vacancies v join companies c on c.company_id=v.company_id where v.created_at>=now()-interval '30 days' group by 1,2 order by count(*) desc,1,2 limit 20`),
  ]);
  const periodMap = Object.fromEntries(periods.rows.map((row) => [row.label, metric(row)]));
  const attentionRow = attention.rows[0] ?? {};
  return {
    generated_at: new Date().toISOString(),
    timezone: "America/Panama",
    periods: {
      today: periodMap.today ?? metric(null),
      last_7_days: periodMap.last_7_days ?? metric(null),
      last_30_days: periodMap.last_30_days ?? metric(null),
    },
    current: {
      candidates_by_status: countBy(candidates.rows, "status"),
      companies: Number(companies.rows[0]?.total ?? 0),
      vacancies_by_status: countBy(vacancies.rows, "status"),
      payments_by_status: countBy(payments.rows, "status"),
      deliveries_by_status: countBy(deliveries.rows, "status"),
      candidates_expiring_7_days: Number(attentionRow.candidates_expiring_7_days ?? 0),
    },
    attention: {
      payments_pending_review: Number(attentionRow.payments_pending_review ?? 0),
      approved_waiting_search: Number(attentionRow.approved_waiting_search ?? 0),
      deliveries_waiting_send: Number(attentionRow.deliveries_waiting_send ?? 0),
      candidates_expiring_7_days: Number(attentionRow.candidates_expiring_7_days ?? 0),
    },
    comparisons: {
      last_7_vs_previous_7: compare7,
      last_30_vs_previous_30: compare30,
    },
    geography: {
      candidate_registrations_last_30_days: candidateGeo.rows.map((row) => ({ province: String(row.province), district: String(row.district), candidates: Number(row.candidates ?? 0) })),
      requests_last_30_days: requestGeo.rows.map((row) => ({ province: String(row.province), district: String(row.district), vacancies: Number(row.vacancies ?? 0), services: Number(row.services ?? 0) })),
    },
  };
}

async function comparisonQuery(queryable: Queryable, days: 7 | 30) {
  const interval = `${days} days`;
  const result = await queryable.query(`select (select count(*) from candidate_profiles where created_at>=now()-$1::interval)::int current_candidates,(select count(*) from candidate_profiles where created_at>=now()-($1::interval*2) and created_at<now()-$1::interval)::int previous_candidates,(select count(*) from companies where created_at>=now()-$1::interval)::int current_companies,(select count(*) from companies where created_at>=now()-($1::interval*2) and created_at<now()-$1::interval)::int previous_companies,(select count(*) from vacancies where request_type='VACANTE' and created_at>=now()-$1::interval)::int current_vacancy_requests,(select count(*) from vacancies where request_type='VACANTE' and created_at>=now()-($1::interval*2) and created_at<now()-$1::interval)::int previous_vacancy_requests,(select count(*) from vacancies where request_type='EVENTUAL' and created_at>=now()-$1::interval)::int current_service_requests,(select count(*) from vacancies where request_type='EVENTUAL' and created_at>=now()-($1::interval*2) and created_at<now()-$1::interval)::int previous_service_requests,(select count(*) from service_provider_profiles where created_at>=now()-$1::interval)::int current_service_providers,(select count(*) from service_provider_profiles where created_at>=now()-($1::interval*2) and created_at<now()-$1::interval)::int previous_service_providers,(select coalesce(sum(amount),0) from vacancy_payments where status='APROBADO' and created_at>=now()-$1::interval)::numeric(12,2) current_approved_revenue,(select coalesce(sum(amount),0) from vacancy_payments where status='APROBADO' and created_at>=now()-($1::interval*2) and created_at<now()-$1::interval)::numeric(12,2) previous_approved_revenue,(select count(*) from vacancy_deliveries where status='ENVIADA' and sent_at>=now()-$1::interval)::int current_deliveries_sent,(select count(*) from vacancy_deliveries where status='ENVIADA' and sent_at>=now()-($1::interval*2) and sent_at<now()-$1::interval)::int previous_deliveries_sent`, [interval]);
  const row = result.rows[0] ?? {};
  const side = (prefix: "current" | "previous") => metric({ candidates: row[`${prefix}_candidates`], companies: row[`${prefix}_companies`], vacancy_requests: row[`${prefix}_vacancy_requests`], service_requests: row[`${prefix}_service_requests`], service_providers: row[`${prefix}_service_providers`], approved_revenue: row[`${prefix}_approved_revenue`], deliveries_sent: row[`${prefix}_deliveries_sent`] });
  return { current: side("current"), previous: side("previous") };
}

export function adminAssistantConfigured() { return Boolean(config.deepSeekApiKey); }

export async function askDeepSeekAdmin(question: string, snapshot: AdminAssistantSnapshot, options: ProviderOptions = {}) {
  if (!config.deepSeekApiKey) throw new Error("DEEPSEEK_NOT_CONFIGURED");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? config.deepSeekTimeoutMs);
  timeout.unref?.();
  try {
    const response = await (options.fetchFn ?? fetch)(config.deepSeekBaseUrl.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${config.deepSeekApiKey}` },
      body: JSON.stringify({ model: config.deepSeekModel, temperature: 0, max_tokens: 900, messages: [{ role: "system", content: ADMIN_ASSISTANT_SYSTEM_PROMPT }, { role: "user", content: buildAdminAssistantPrompt(question, snapshot) }] }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`DEEPSEEK_REQUEST_FAILED_${response.status}`);
    const body: any = await response.json();
    const answer = sanitizeAssistantAnswer(body?.choices?.[0]?.message?.content);
    assertAnswerUsesKnownNumbers(answer, snapshot);
    if (answer.length > ADMIN_ASSISTANT_MAX_RESPONSE_CHARS) throw new Error("DEEPSEEK_INVALID_RESPONSE");
    return { provider: "deepseek" as const, model: config.deepSeekModel, answer };
  } catch (error: any) {
    if (error?.name === "AbortError") throw new Error("DEEPSEEK_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
