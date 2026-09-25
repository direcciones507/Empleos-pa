# RBAC matrix — MVP Empleos.pa

The API enforces role authorization server-side through `requireRoles`. A valid ACTIVE session is required before role checks.

| Surface | CANDIDATO | EMPRESA | ADMIN |
| --- | --- | --- | --- |
| Candidate profile, lifecycle and notifications | Allowed for own account | Denied | Denied through candidate routes |
| Company profile and vacancy creation/history | Denied | Allowed for own company | Denied through company routes |
| Company delivery report | Denied | Allowed only for vacancy owned by authenticated company | Admin uses separate delivery route |
| Payments submitted by company | Denied | Allowed only for own vacancy | Review uses ADMIN route |
| Matching/preselection | Denied | Denied | Allowed |
| Delivery preparation/send/closure | Denied | Denied | Allowed |
| Administrative metrics/audit/export | Denied | Denied | Allowed |

## Enforcement rules

- Missing/invalid/expired/revoked session returns `401 UNAUTHENTICATED`.
- An authenticated user with the wrong role returns `403 FORBIDDEN`.
- Disabled users cannot resolve an authenticated session.
- Ownership checks are applied in addition to role checks where EMPRESA accesses vacancy/payment/delivery resources.
- Candidate resources are scoped from the authenticated candidate user ID.
- ADMIN-only operations are not inferred from UI visibility; authorization is enforced by API pre-handlers.

## Physical verification pending

The authorization implementation and route matrix are defined. Cross-role HTTP tests with real sessions remain part of integrated/physical validation before production.
