-- Seed initial providers (subset) — expandable in follow-up seeds
insert into providers (id, name, category, auth_type, required_secrets, config_schema, capabilities)
values
  ('openai','OpenAI','llm','apiKey', '{OPENAI_API_KEY}', '{}', '{llm}'),
  ('anthropic','Anthropic','llm','apiKey', '{ANTHROPIC_API_KEY}', '{}', '{llm}'),
  ('google-gemini','Google Gemini','llm','apiKey', '{GEMINI_API_KEY}', '{}', '{llm}'),
  ('mistral','Mistral','llm','apiKey', '{MISTRAL_API_KEY}', '{}', '{llm}'),
  ('slack','Slack','chat','oauth', '{SLACK_BOT_TOKEN,SLACK_SIGNING_SECRET}', '{}', '{chat,webhook}'),
  ('gmail','Gmail','email','oauth', '{GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET}', '{}', '{email}'),
  ('sendgrid','SendGrid','email','apiKey', '{SENDGRID_API_KEY}', '{}', '{email}'),
  ('notion','Notion','docs','apiKey', '{NOTION_API_KEY}', '{}', '{docs}'),
  ('airtable','Airtable','http','apiKey', '{AIRTABLE_API_KEY}', '{}', '{sheets,db}'),
  ('openweather','OpenWeather','weather','apiKey', '{OPENWEATHER_API_KEY}', '{}', '{weather}')
on conflict (id) do nothing;


