export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
// Shared PINs cannot authorize access to real patients.
export async function POST() {
  return NextResponse.json({ error: 'Sign in with Google. Roles are assigned through care circle membership.' }, { status: 410 });
}
