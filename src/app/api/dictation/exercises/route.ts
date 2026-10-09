import { NextRequest, NextResponse } from 'next/server';
import { getExercises } from '@/lib/dictation/queries';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') ?? undefined;
    const difficulty = searchParams.get('difficulty')
      ? Number(searchParams.get('difficulty'))
      : undefined;
    const page = Number(searchParams.get('page') ?? '1');
    const limit = Math.min(Number(searchParams.get('limit') ?? '12'), 50);

    const result = await getExercises({ category, difficulty, page, limit });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('GET /api/dictation/exercises error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch exercises' },
      { status: 500 }
    );
  }
}
