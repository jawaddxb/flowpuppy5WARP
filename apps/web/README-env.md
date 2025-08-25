# Environment setup for apps/web

Create a file named `.env.local` inside `apps/web/` (same folder as `package.json`) and add at least one AI key. OpenRouter is a good universal fallback.

```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
MISTRAL_API_KEY=
GEMINI_API_KEY=
DEEPSEEK_API_KEY=
QWEN_API_KEY=
OPENROUTER_API_KEY=

# Optional Supabase (local dev)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Optional integrations used in some DSLs
TWITTER_BEARER=
```

Notes:
- Provider routing respects the admin routing order if configured; otherwise it uses availability/health. `openrouter` is appended as a final fallback.
- There are no code fallbacks: if all LLMs fail, APIs return HTTP 502 with a list of provider errors.
