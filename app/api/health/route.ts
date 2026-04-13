import { NextResponse } from 'next/server';

export async function GET() {
  const apiKeyPresent = !!process.env.ANTHROPIC_API_KEY;
  const nodeEnv = process.env.NODE_ENV;
  
  return NextResponse.json({
    apiKeyPresent,
    nodeEnv
  }, { status: 200 });
}
