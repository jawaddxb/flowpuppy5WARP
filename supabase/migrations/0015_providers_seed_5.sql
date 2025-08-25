-- Final batch to reach ~100 providers
insert into public.providers (id, name, category, auth_type, required_secrets) values
('shopify', 'Shopify', 'ecomm', 'apiKey', '{"SHOPIFY_ACCESS_TOKEN"}'),
('stripe', 'Stripe', 'payments', 'apiKey', '{"STRIPE_SECRET_KEY"}'),
('paypal', 'PayPal', 'payments', 'apiKey', '{"PAYPAL_CLIENT_ID","PAYPAL_CLIENT_SECRET"}'),
('square', 'Square', 'payments', 'apiKey', '{"SQUARE_ACCESS_TOKEN"}'),
('braintree', 'Braintree', 'payments', 'apiKey', '{"BRAINTREE_API_KEY"}'),
('algolia', 'Algolia', 'search', 'apiKey', '{"ALGOLIA_API_KEY"}'),
('supabase', 'Supabase', 'db', 'apiKey', '{"NEXT_PUBLIC_SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"}'),
('firebase', 'Firebase', 'db', 'apiKey', '{"FIREBASE_SERVICE_ACCOUNT"}'),
('vercel', 'Vercel', 'ci', 'apiKey', '{"VERCEL_TOKEN"}'),
('netlify', 'Netlify', 'ci', 'apiKey', '{"NETLIFY_AUTH_TOKEN"}'),
('heroku', 'Heroku', 'deploy', 'apiKey', '{"HEROKU_API_KEY"}'),
('datadog', 'Datadog', 'monitoring', 'apiKey', '{"DATADOG_API_KEY"}'),
('newrelic', 'New Relic', 'monitoring', 'apiKey', '{"NEW_RELIC_LICENSE_KEY"}'),
('sentry', 'Sentry', 'logging', 'apiKey', '{"SENTRY_AUTH_TOKEN"}'),
('cloudflare', 'Cloudflare', 'http', 'apiKey', '{"CLOUDFLARE_API_TOKEN"}'),
('discord', 'Discord', 'chat', 'apiKey', '{"DISCORD_BOT_TOKEN"}'),
('telegram', 'Telegram', 'chat', 'apiKey', '{"TELEGRAM_BOT_TOKEN"}'),
('monday', 'Monday.com', 'project', 'apiKey', '{"MONDAY_API_TOKEN"}'),
('figma', 'Figma', 'design', 'apiKey', '{"FIGMA_TOKEN"}'),
('calendly', 'Calendly', 'calendar', 'apiKey', '{"CALENDLY_TOKEN"}'),
('zoom', 'Zoom', 'video', 'apiKey', '{"ZOOM_CLIENT_ID","ZOOM_CLIENT_SECRET"}'),
('dropbox', 'Dropbox', 'storage', 'apiKey', '{"DROPBOX_API_TOKEN"}'),
('box', 'Box', 'storage', 'apiKey', '{"BOX_API_TOKEN"}'),
('onedrive', 'OneDrive', 'storage', 'apiKey', '{"MS_CLIENT_ID","MS_CLIENT_SECRET"}'),
('google-drive', 'Google Drive', 'storage', 'apiKey', '{"GOOGLE_DRIVE_API_KEY"}')
on conflict (id) do nothing;


