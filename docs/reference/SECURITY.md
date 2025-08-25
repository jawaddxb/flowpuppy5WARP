### Security & Safety Controls

## HTTP Node SSRF Protection

- Allowlist hosts (env or DB-backed) and scheme check (https/http with config flag).
- Method whitelist: GET, POST, PUT, PATCH, DELETE.
- Max body size; timeout; no redirects by default.
- URL validation before fetch; DNS resolution non-private if feasible in runtime.

## Transform Sandbox

- Replace `new Function` with an isolated runner (small VM with time and memory caps) on the server.
- Deny globals; provide `input` only; limit execution time; capture logs/errors.

## Secrets Handling

- Storage via Supabase `secrets` table; redact in UIs; never send back values in listings.
- Env-based secrets only read server-side; client UI references names.

## Headers & CSP

- Add CSP and security headers to all pages; disallow inline scripts where feasible.

## Observability

- Log execution spans per node; count retries/timeouts; error tagging for integrations.

## Acceptance (Sprint A/B)

- Unit tests demonstrate SSRF block for private IPs and disallowed hosts.
- Transform exceeds time → terminated with error event; test verifies behavior.
- CSP headers present; simple report-only mode to begin.


