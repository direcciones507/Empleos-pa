from pathlib import Path
p=Path('apps/api/src/candidate-routes.ts')
s=p.read_text()
old='''        const c = p.confirmations ?? {};
        const valid =
          !!p.full_name &&
          !!p.identity_document_type &&
          !!p.identity_document_number &&
          !!p.contact_email &&
          !!p.mobile_whatsapp &&
          !!p.province &&
          !!p.district &&
          !!p.corregimiento &&
          !!p.address_reference &&
          !!p.work_profile &&
          !!p.primary_job_area &&
          typeof p.currently_working === "boolean" &&
          !!p.available_from &&
          !!p.work_locations &&
          !!p.availability_notes &&
          !!p.contact_preference &&
          !!p.skills &&
          typeof p.has_experience === "boolean" &&
          Array.isArray(p.education) &&
          p.education.length > 0 &&
          c.correct === true &&
          c.data_processing === true &&
          c.no_hiring_guarantee === true;
        if (!valid) {
          await client.query("rollback");
          return reply.code(400).send({ error: "PROFILE_INCOMPLETE" });
        }'''
new='''        const c = p.confirmations ?? {};
        const requiredChecks: Array<[string, boolean]> = [
          ["full_name", !!p.full_name],
          ["identity_document_type", !!p.identity_document_type],
          ["identity_document_number", !!p.identity_document_number],
          ["contact_email", !!p.contact_email],
          ["mobile_whatsapp", !!p.mobile_whatsapp],
          ["province", !!p.province],
          ["district", !!p.district],
          ["corregimiento", !!p.corregimiento],
          ["address_reference", !!p.address_reference],
          ["work_profile", !!p.work_profile],
          ["primary_job_area", !!p.primary_job_area],
          ["currently_working", typeof p.currently_working === "boolean"],
          ["available_from", !!p.available_from],
          ["work_locations", !!p.work_locations],
          ["skills", !!p.skills],
          ["has_experience", typeof p.has_experience === "boolean"],
          ["education", Array.isArray(p.education) && p.education.length > 0],
          ["confirmations.correct", c.correct === true],
          ["confirmations.data_processing", c.data_processing === true],
          ["confirmations.no_hiring_guarantee", c.no_hiring_guarantee === true],
        ];
        const missing = requiredChecks.find(([, valid]) => !valid)?.[0];
        if (missing) {
          await client.query("rollback");
          return reply.code(400).send({ error: "PROFILE_INCOMPLETE", field: missing });
        }'''
if old not in s: raise SystemExit('submit validation block not found')
s=s.replace(old,new,1)
old2='''        await client.query(
          "update users set status='DISABLED',disabled_at=now(),disabled_reason='USER_REQUEST',updated_at=now() where user_id=$1",
          [req.authUser!.user_id],
        );
        await client.query(
          "update auth_sessions set revoked_at=now() where user_id=$1 and revoked_at is null",
          [req.authUser!.user_id],
        );
        await client.query(
          "update password_reset_tokens set used_at=now() where user_id=$1 and used_at is null",
          [req.authUser!.user_id],
        );
        await client.query("commit");
        reply.clearCookie("empleos_session", { path: "/" });
        return { ok: true, account_status: "DISABLED" };'''
new2='''        await client.query("commit");
        return { ok: true, profile_status: "RETIRADO" };'''
if old2 not in s: raise SystemExit('candidate disable account block not found')
s=s.replace(old2,new2,1)
p.write_text(s)
