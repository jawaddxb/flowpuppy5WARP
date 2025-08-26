import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.1.0',
    commit: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
    checks: {
      database: 'pending',
      providers: 'pending'
    }
  };

  // TODO: Add actual health checks
  
  return NextResponse.json(health);
}
