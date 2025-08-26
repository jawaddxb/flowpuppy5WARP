# Secrets Rotation Runbook

## Overview
This document outlines the procedure for rotating secrets and encryption keys.

## Rotation Schedule
- API Keys: Every 90 days
- Encryption Keys: Every 180 days
- OAuth Secrets: Every 365 days

## Rotation Procedure

### 1. Provider API Keys
1. Generate new key in provider dashboard
2. Update in GitHub Secrets or .env.local
3. Test with a simple API call
4. Revoke old key after 24 hours

### 2. Encryption Keys (AES-GCM)
1. Generate new key: `openssl rand -hex 32`
2. Set as ENCRYPTION_KEY_NEW in env
3. Run migration: `npm run secrets:rotate`
4. After verification, promote to ENCRYPTION_KEY
5. Remove ENCRYPTION_KEY_NEW

### 3. Supabase Keys
1. Rotate in Supabase dashboard
2. Update SUPABASE_SERVICE_ROLE_KEY
3. Update NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Restart all services

## Emergency Rotation
If a key is compromised:
1. Immediately revoke the compromised key
2. Generate and deploy new key
3. Audit logs for unauthorized access
4. Notify security team

## Verification
After rotation:
- Run E2E tests: `npm run e2e`
- Check provider connections: `/api/providers/health`
- Verify encrypted data access
