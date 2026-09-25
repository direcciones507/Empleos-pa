# Data boundaries — MVP Empleos.pa

This document records the practical data-minimization boundary already enforced by the MVP. It does not define legal retention periods.

## Candidate profile

Candidate contact data (name, phone and account email) is stored for operational contact and delivery. Labor data (job area, profile, skills, education, experience, location and availability) is used for structured matching.

DeepSeek receives only the bounded labor/context fields required for descriptive analysis plus an internal candidate identifier used to correlate the response. It does not receive candidate code, full name, phone or account email.

## Company delivery

Contact data is exposed to the requesting company only through a delivery snapshot after an ADMIN has preselected active candidates and the delivery is sent. The snapshot preserves the historical information actually delivered.

## Public exposure

Candidate profiles and contact data are not public directory records. Candidate endpoints require the CANDIDATO role, company delivery endpoints require ownership plus the EMPRESA role, and matching/delivery administration requires ADMIN.

## Sensitive documents

The MVP does not request or store police records, identity-card images, diplomas, certificates or other hiring documents. The company requests and verifies any required hiring documentation directly from the candidate after contact.

## Retention boundary

Disabling an account immediately removes it from active operational flows and revokes authentication. Final deletion/anonymization periods for business records, delivery snapshots and audit evidence remain intentionally undefined until the final privacy/legal policy is approved.
