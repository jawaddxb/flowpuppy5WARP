### Integrations Pack v1

## Summary

Supported nodes: Email (SendGrid), Slack, Discord, Notion, Google Sheets, Airtable. Live vs mock behavior is auto-selected by presence of env keys.

## Environment Setup (apps/web/.env.local)

```
# Email via SendGrid
SENDGRID_API_KEY=...
SENDGRID_FROM=you@example.com

# Slack
SLACK_BOT_TOKEN=xoxb-...

# Discord
DISCORD_BOT_TOKEN=...

# Notion
NOTION_TOKEN=secret_...

# Google Sheets (API key access for read)
GOOGLE_SHEETS_API_KEY=...

# Airtable
AIRTABLE_API_KEY=pat_...
```

If a key is missing, the executor uses a fast mock with realistic shape. This enables CI to run tests without third-party calls.

## Node Config Quick Reference

- email: `{ to, subject, body }` (SendGrid used if keys present)
- slack: `{ channel, message, tokenSecret? }` (`tokenSecret` overrides env token)
- discord: `{ webhookUrl? | channelId + tokenSecret?, message }`
- notion: `{ operation: createPage|updatePage, databaseId }`
- sheets: `{ operation: read|append, spreadsheetId, range }`
- airtable: `{ operation: createRecord|updateRecord, baseId, table, fields }`

## Testing Guidance

- Unit tests: mock mode covers status/shape; ensure errors are surfaced meaningfully.
- Manual live test: set envs, trigger nodes in a simple flow, validate external side-effects (message sent, row appended).

## Roadmap (Sprint A)

- Add mock adapters for CI; add integration tests per service.
- Document rate limits and typical error cases; implement retries/backoff per API where sensible.


