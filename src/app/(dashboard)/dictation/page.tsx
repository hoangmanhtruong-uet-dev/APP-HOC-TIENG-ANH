import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getExercises, getUserProgress, getUserStats } from '@/lib/dictation/queries';
import { DictationExerciseList } from '@/components/dictation/DictationExerciseList';
import { DictationStatsCard } from '@/components/dictation/DictationStatsCard';
import type { DictationProgress } from '@/types/dictation';

interface PageProps {
  searchParams: Promise<{
    category?: string;
    difficulty?: string;
    page?: string;
  }>;
}

export default async function DictationPage({ searchParams }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolvedSearchParams = await searchParams;

  const { exercises, total, page, totalPages } = await getExercises({
    category: resolvedSearchParams.category,
    difficulty: resolvedSearchParams.difficulty
      ? Number(resolvedSearchParams.difficulty)
      : undefined,
    page: Number(resolvedSearchParams.page ?? '1'),
  });

  // Fetch user progress if logged in
  const progressMap = new Map<string, DictationProgress>();
  let stats = null;

  if (user) {
    const exerciseIds = exercises.map((e) => e.id);
    const [progressData, statsData] = await Promise.all([
      getUserProgress(user.id, exerciseIds),
      getUserStats(user.id),
    ]);
    progressData.forEach((p) => progressMap.set(p.exercise_id, p));
    stats = statsData;
  }

  const categories = [
    { value: '', label: 'Tất cả' },
    { value: 'general', label: 'Tổng hợp' },
    { value: 'daily', label: 'Giao tiếp' },
    { value: 'business', label: 'Công sở' },
    { value: 'academic', label: 'Học thuật' },
    { value: 'news', label: 'Tin tức' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          🎧 Luyện nghe chép chính tả
        </h1>
        <p className="text-gray-500 mt-2">
          Nghe audio tiếng Anh và gõ lại chính xác. Cải thiện kỹ năng nghe mỗi
          ngày!
        </p>
      </div>

      {/* User Stats */}
      {stats && stats.total_exercises_attempted > 0 && (
        <div className="mb-8">
          <DictationStatsCard stats={stats} />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((cat) => (
          <a
            key={cat.value}
            href={`/dictation${cat.value ? `?category=${cat.value}` : ''}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              (resolvedSearchParams.category ?? '') === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            {cat.label}
          </a>
        ))}
      </div>

      {/* Exercise List */}
      <DictationExerciseList exercises={exercises} progressMap={progressMap} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/dictation?page=${p}${
                resolvedSearchParams.category
                  ? `&category=${resolvedSearchParams.category}`
                  : ''
              }`}
              className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
