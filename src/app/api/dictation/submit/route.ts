import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { submitAnswer } from '@/lib/dictation/queries';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { exerciseId, sentenceId, userInput, timeSpent, replayCount } = body;

    if (!exerciseId || !sentenceId || typeof userInput !== 'string') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await submitAnswer({
      userId: user.id,
      exerciseId,
      sentenceId,
      userInput: userInput.trim(),
      timeSpent: timeSpent ?? 0,
      replayCount: replayCount ?? 0,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/dictation/submit error:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
