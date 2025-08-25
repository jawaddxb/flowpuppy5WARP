-- Seed additional providers (chunk 2)
insert into providers (id, name, category, auth_type, required_secrets, config_schema, capabilities)
values
  ('outlook','Outlook (Microsoft 365)','email','oauth', '{AZURE_CLIENT_ID,AZURE_CLIENT_SECRET}', '{}', '{email}'),
  ('mailgun','Mailgun','email','apiKey', '{MAILGUN_API_KEY}', '{}', '{email}'),
  ('postmark','Postmark','email','apiKey', '{POSTMARK_SERVER_TOKEN}', '{}', '{email}'),
  ('ses','AWS SES','email','apiKey', '{AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY}', '{}', '{email}'),

  ('discord','Discord','chat','apiKey', '{DISCORD_BOT_TOKEN}', '{}', '{chat}'),
  ('telegram-bot','Telegram Bot','chat','apiKey', '{TELEGRAM_BOT_TOKEN}', '{}', '{chat}'),
  ('twilio','Twilio','chat','apiKey', '{TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN}', '{}', '{sms,whatsapp,voice}'),
  ('microsoft-teams','Microsoft Teams','chat','oauth', '{AZURE_CLIENT_ID,AZURE_CLIENT_SECRET}', '{}', '{chat}'),

  ('confluence','Confluence (Atlassian)','docs','apiKey', '{ATLASSIAN_API_TOKEN,ATLASSIAN_EMAIL}', '{}', '{docs}'),
  ('google-docs','Google Docs','docs','oauth', '{GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET}', '{}', '{docs}'),
  ('sharepoint','SharePoint','docs','oauth', '{AZURE_CLIENT_ID,AZURE_CLIENT_SECRET}', '{}', '{docs}'),

  ('jira','Jira','http','apiKey', '{ATLASSIAN_API_TOKEN,ATLASSIAN_EMAIL,JIRA_BASE_URL}', '{}', '{issues,projects}'),
  ('asana','Asana','http','apiKey', '{ASANA_ACCESS_TOKEN}', '{}', '{tasks}'),
  ('trello','Trello','http','apiKey', '{TRELLO_KEY,TRELLO_TOKEN}', '{}', '{boards}'),
  ('linear','Linear','http','apiKey', '{LINEAR_API_KEY}', '{}', '{issues}')
on conflict (id) do nothing;


