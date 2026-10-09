'use client';

import React, { memo } from 'react';
import { DictationSpeedSelector } from './DictationSpeedSelector';

interface Props {
  isPlaying: boolean;
  isLoading: boolean;
  playbackSpeed: number;
  replayCount: number;
  onTogglePlay: () => void;
  onReplaySentence: () => void;
  onSpeedChange: (speed: number) => void;
}

export const DictationAudioControls = memo(function DictationAudioControls({
  isPlaying,
  isLoading,
  playbackSpeed,
  replayCount,
  onTogglePlay,
  onReplaySentence,
  onSpeedChange,
}: Props) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-gray-50 rounded-xl">
      <div className="flex items-center gap-2">
        {/* Replay sentence button */}
        <button
          onClick={onReplaySentence}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors font-medium"
          title="Nghe lại câu hiện tại (Ctrl+Space)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Nghe lại</span>
          {replayCount > 0 && (
            <span className="bg-blue-500 text-xs px-1.5 py-0.5 rounded-full">
              {replayCount}
            </span>
          )}
        </button>
      </div>

      <DictationSpeedSelector
        currentSpeed={playbackSpeed}
        onSpeedChange={onSpeedChange}
      />
    </div>
  );
});
