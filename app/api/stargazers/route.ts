import { NextRequest, NextResponse } from 'next/server';
import { getStargazers } from '@/lib/github';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const repo = searchParams.get('repo');
  if (!repo) return NextResponse.json({ error: 'Repo is required' }, { status: 400 });

  const stargazers = await getStargazers(repo);

  return NextResponse.json(stargazers);
}
