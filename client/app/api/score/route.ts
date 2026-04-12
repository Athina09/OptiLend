import { NextRequest, NextResponse } from 'next/server';

const SCORING_API_URL = process.env.SCORING_API_URL || 'http://127.0.0.1:5055';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const r = await fetch(`${SCORING_API_URL}/score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    return NextResponse.json(data, { status: r.status });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'Scoring service unreachable',
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 502 }
    );
  }
}
