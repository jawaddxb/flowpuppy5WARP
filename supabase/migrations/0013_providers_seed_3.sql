-- Seed additional providers (chunk 3)
insert into providers (id, name, category, auth_type, required_secrets, config_schema, capabilities)
values
  -- CRM / CS
  ('salesforce','Salesforce','crm','oauth', '{SALESFORCE_CLIENT_ID,SALESFORCE_CLIENT_SECRET}', '{}', '{crm}'),
  ('hubspot','HubSpot','crm','apiKey', '{HUBSPOT_ACCESS_TOKEN}', '{}', '{crm}'),
  ('pipedrive','Pipedrive','crm','apiKey', '{PIPEDRIVE_API_TOKEN}', '{}', '{crm}'),
  ('zendesk','Zendesk','crm','apiKey', '{ZENDESK_EMAIL,ZENDESK_API_TOKEN,ZENDESK_SUBDOMAIN}', '{}', '{crm}'),
  ('intercom','Intercom','crm','apiKey', '{INTERCOM_TOKEN}', '{}', '{crm}'),
  ('zoho-crm','Zoho CRM','crm','oauth', '{ZOHO_CLIENT_ID,ZOHO_CLIENT_SECRET}', '{}', '{crm}'),

  -- Storage
  ('s3','AWS S3','storage','apiKey', '{AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY}', '{}', '{storage}'),
  ('google-drive','Google Drive','storage','oauth', '{GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET}', '{}', '{storage}'),
  ('dropbox','Dropbox','storage','apiKey', '{DROPBOX_TOKEN}', '{}', '{storage}'),
  ('onedrive','OneDrive','storage','oauth', '{AZURE_CLIENT_ID,AZURE_CLIENT_SECRET}', '{}', '{storage}'),
  ('box','Box','storage','apiKey', '{BOX_DEVELOPER_TOKEN}', '{}', '{storage}'),

  -- Payments / E-comm
  ('stripe','Stripe','payments','apiKey', '{STRIPE_API_KEY}', '{}', '{payments}'),
  ('paypal','PayPal','payments','oauth', '{PAYPAL_CLIENT_ID,PAYPAL_CLIENT_SECRET}', '{}', '{payments}'),
  ('shopify','Shopify','ecomm','apiKey', '{SHOPIFY_STORE,SHOPIFY_ACCESS_TOKEN}', '{}', '{ecomm}'),
  ('woocommerce','WooCommerce','ecomm','apiKey', '{WOOCOMMERCE_CONSUMER_KEY,WOOCOMMERCE_CONSUMER_SECRET}', '{}', '{ecomm}'),
  ('square','Square','payments','apiKey', '{SQUARE_ACCESS_TOKEN}', '{}', '{payments}'),
  ('adyen','Adyen','payments','apiKey', '{ADYEN_API_KEY}', '{}', '{payments}'),

  -- Calendars / Meetings
  ('google-calendar','Google Calendar','calendar','oauth', '{GOOGLE_CLIENT_ID,GOOGLE_CLIENT_SECRET}', '{}', '{calendar}'),
  ('outlook-calendar','Outlook Calendar','calendar','oauth', '{AZURE_CLIENT_ID,AZURE_CLIENT_SECRET}', '{}', '{calendar}'),
  ('calendly','Calendly','calendar','apiKey', '{CALENDLY_TOKEN}', '{}', '{calendar}'),
  ('zoom','Zoom','calendar','oauth', '{ZOOM_CLIENT_ID,ZOOM_CLIENT_SECRET}', '{}', '{meetings}')
on conflict (id) do nothing;


