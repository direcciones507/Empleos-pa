# Secret deployment — Empleos.pa

Real credentials must never be committed to this repository, pasted into source files, exposed through `NEXT_PUBLIC_*` variables, or stored in browser code.

## API-only secrets

Configure these in the private environment-variable/secret manager of the API runtime:

- `DATABASE_URL`
- `DEEPSEEK_API_KEY`
- `GOOGLE_CLIENT_SECRET`
- `EMAIL_WEBHOOK_SECRET`
- `LIFECYCLE_CRON_SECRET`

Public configuration such as `GOOGLE_CLIENT_ID`, URLs and non-secret mode flags may be environment variables, but server secrets stay API-side.

## DeepSeek

Set `DEEPSEEK_API_KEY` only on the API service. The repository's `.env.example` intentionally contains an empty placeholder. Local `.env` and `.env.*` files are ignored by Git.

Before production:
1. create/load the real secret in the API runtime;
2. restart/redeploy the API so the process receives it;
3. perform one controlled descriptive-analysis request;
4. verify logs and responses do not expose the key;
5. rotate the key immediately if it is ever committed, logged or otherwise exposed.

Never send the DeepSeek key to the web application or prefix it with `NEXT_PUBLIC_`.

## Other production credentials

Google OAuth client secret, email webhook secret, scheduler bearer secret and database credentials follow the same server-only rule. Production values are configured during physical deployment, not during public-repository construction.
