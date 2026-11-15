import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/db/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const db = dbService.getDb();
    const profileId = searchParams.get('profileId') || db.profiles[0].id;

    const logs = db.auditLogs.filter((l) => l.profileId === profileId);
    return NextResponse.json({
      total: logs.length,
      logs
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown internal error';
    return NextResponse.json({ error: 'Failed to retrieve audit logs', details: errorMsg }, { status: 500 });
  }
}
