'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import type { DictationExercise, DictationProgress } from '@/types/dictation';

interface Props {
  exercise: DictationExercise;
  progress?: DictationProgress | null;
}

const difficultyLabels = ['', 'Dễ', 'Cơ bản', 'Trung bình', 'Khó', 'Rất khó'];
const difficultyColors = [
  '',
  'bg-green-100 text-green-700',
  'bg-blue-100 text-blue-700',
  'bg-yellow-100 text-yellow-700',
  'bg-orange-100 text-orange-700',
  'bg-red-100 text-red-700',
];

export const DictationExerciseCard = memo(function DictationExerciseCard({
  exercise,
  progress,
}: Props) {
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <Link
      href={`/dictation/${exercise.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-5
                 hover:shadow-md hover:border-blue-300 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
          {exercise.title}
        </h3>
        {progress?.completed && (
          <span className="text-green-500 text-lg flex-shrink-0 ml-2">✓</span>
        )}
      </div>

      {exercise.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">
          {exercise.description}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            difficultyColors[exercise.difficulty]
          }`}
        >
          {difficultyLabels[exercise.difficulty]}
        </span>
        <span className="text-xs text-gray-400">
          {exercise.total_sentences} câu
        </span>
        <span className="text-xs text-gray-400">
          {formatDuration(exercise.duration_seconds)}
        </span>
      </div>

      {progress && !progress.completed && progress.attempts_count > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Tiến độ</span>
            <span>
              {progress.completed_sentences}/{progress.total_sentences}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{
                width: `${
                  (progress.completed_sentences / progress.total_sentences) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      )}
    </Link>
  );
});
