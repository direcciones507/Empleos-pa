import type { FastifyInstance } from "fastify";
import { requireRoles } from "./rbac.js";
import { writeAdminAudit } from "./admin-audit.js";
import { adminAssistantConfigured, askDeepSeekAdmin, buildAdminAssistantSnapshot } from "./admin-assistant.js";
import { classifyAdminQuestion, validateAdminQuestion } from "./admin-assistant-core.js";

export async function adminAssistantRoutes(app: FastifyInstance) {
  app.get("/v1/admin/assistant/status", { preHandler: requireRoles("ADMIN") }, async () => ({
    configured: adminAssistantConfigured(),
    mode: "READ_ONLY",
  }));

  app.post("/v1/admin/assistant/query", { preHandler: requireRoles("ADMIN") }, async (req: any, reply) => {
    const validated = validateAdminQuestion(req.body?.question);
    if (!validated.ok) return reply.code(400).send({ error: validated.error });
    if (!adminAssistantConfigured()) return reply.code(503).send({ error: "DEEPSEEK_NOT_CONFIGURED", configured: false });
    const category = classifyAdminQuestion(validated.question);
    try {
      const snapshot = await buildAdminAssistantSnapshot();
      const result = await askDeepSeekAdmin(validated.question, snapshot);
      await writeAdminAudit({ adminUserId: req.authUser!.user_id, action: "ADMIN_ASSISTANT_QUERY", entityType: "ADMIN_ASSISTANT", entityId: category, metadata: { category, provider: result.provider, model: result.model } });
      return { configured: true, mode: "READ_ONLY", generated_at: snapshot.generated_at, category, answer: result.answer };
    } catch (error: any) {
      req.log.warn({ err: error, category }, "admin assistant request failed");
      const code = error?.message === "DEEPSEEK_TIMEOUT" ? "DEEPSEEK_TIMEOUT" : error?.message === "ADMIN_ASSISTANT_CONTEXT_TOO_LARGE" ? "ADMIN_ASSISTANT_CONTEXT_TOO_LARGE" : error?.message === "DEEPSEEK_FACT_CONFLICT" ? "DEEPSEEK_FACT_CONFLICT" : "DEEPSEEK_UNAVAILABLE";
      return reply.code(code === "ADMIN_ASSISTANT_CONTEXT_TOO_LARGE" || code === "DEEPSEEK_FACT_CONFLICT" ? 422 : 503).send({ error: code, configured: true });
    }
  });
}
