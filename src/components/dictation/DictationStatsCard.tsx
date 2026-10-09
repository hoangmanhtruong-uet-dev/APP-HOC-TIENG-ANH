'use client';

import React from 'react';
import type { DictationUserStats } from '@/types/dictation';

interface Props {
  stats: DictationUserStats;
}

export function DictationStatsCard({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl p-4 border text-center">
        <div className="text-2xl font-bold text-blue-600">
          {stats.total_exercises_attempted}
        </div>
        <div className="text-xs text-gray-500 mt-1">Bài đã luyện</div>
      </div>
      <div className="bg-white rounded-xl p-4 border text-center">
        <div className="text-2xl font-bold text-green-600">
          {stats.total_exercises_completed}
        </div>
        <div className="text-xs text-gray-500 mt-1">Bài hoàn thành</div>
      </div>
      <div className="bg-white rounded-xl p-4 border text-center">
        <div className="text-2xl font-bold text-purple-600">
          {stats.average_best_score}%
        </div>
        <div className="text-xs text-gray-500 mt-1">Điểm TB cao nhất</div>
      </div>
      <div className="bg-white rounded-xl p-4 border text-center">
        <div className="text-2xl font-bold text-orange-600">
          {stats.total_attempts}
        </div>
        <div className="text-xs text-gray-500 mt-1">Tổng lượt làm</div>
      </div>
    </div>
  );
}
