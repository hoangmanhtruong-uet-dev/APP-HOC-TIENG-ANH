import "server-only";

export interface PhonemeScore {
  phoneme: string;
  accuracyScore: number;
}

export interface WordPronunciationScore {
  word: string;
  accuracyScore: number;
  phonemes: PhonemeScore[];
  isMispronounced: boolean;
}

export interface PronunciationEvaluationResult {
  overallScore: number;
  fluencyScore: number;
  completenessScore: number;
  pronunciationBand: number;
  words: WordPronunciationScore[];
}

export function evaluatePronunciationTranscript(
  transcript: string,
  audioDurationSeconds: number,
): PronunciationEvaluationResult {
  const words = transcript
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0 || audioDurationSeconds <= 0) {
    return {
      overallScore: 0,
      fluencyScore: 0,
      completenessScore: 0,
      pronunciationBand: 0,
      words: [],
    };
  }

  // Calculate words per minute (WPM)
  const wpm = (words.length / audioDurationSeconds) * 60;
  // Ideal IELTS Speaking WPM is 110-150 WPM
  const fluencyScore = Math.min(100, Math.max(0, Math.round((wpm / 130) * 100)));
  const completenessScore = Math.min(100, words.length >= 5 ? 100 : words.length * 20);

  const wordScores: WordPronunciationScore[] = words.map((word) => {
    const cleanWord = word.replace(/[^a-zA-Z]/g, "").toLowerCase();
    const mockAccuracy = Math.min(100, Math.max(60, 75 + (cleanWord.length % 5) * 5));
    const isMispronounced = mockAccuracy < 70;

    const phonemes: PhonemeScore[] = cleanWord.split("").map((char) => ({
      phoneme: char,
      accuracyScore: mockAccuracy,
    }));

    return {
      word: cleanWord,
      accuracyScore: mockAccuracy,
      phonemes,
      isMispronounced,
    };
  });

  const avgWordAccuracy = Math.round(
    wordScores.reduce((acc, curr) => acc + curr.accuracyScore, 0) / wordScores.length,
  );

  const overallScore = Math.round(
    avgWordAccuracy * 0.5 + fluencyScore * 0.3 + completenessScore * 0.2,
  );

  // Map 0-100 score to IELTS Band 0-9
  const pronunciationBand = Math.round((overallScore / 100) * 9 * 2) / 2;

  return {
    overallScore,
    fluencyScore,
    completenessScore,
    pronunciationBand,
    words: wordScores,
  };
}
