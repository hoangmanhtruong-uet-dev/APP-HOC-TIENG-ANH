import { notFound } from 'next/navigation';
import { getExerciseById } from '@/lib/dictation/queries';
import { DictationPlayer } from '@/components/dictation/DictationPlayer';
import Link from 'next/link';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ exerciseId: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const { exercise } = await getExerciseById(resolvedParams.exerciseId);
    return {
      title: `${exercise.title} | Luyện nghe chép chính tả`,
      description: exercise.description ?? 'Luyện nghe chép chính tả tiếng Anh',
    };
  } catch {
    return { title: 'Bài tập không tồn tại' };
  }
}

export default async function DictationExercisePage({ params }: PageProps) {
  const resolvedParams = await params;
  let data;
  try {
    data = await getExerciseById(resolvedParams.exerciseId);
  } catch {
    notFound();
  }

  const { exercise, sentences } = data;

  if (!exercise || sentences.length === 0) {
    notFound();
  }

  // Prefetch audio via link header
  return (
    <>
      <link rel="prefetch" href={exercise.audio_url} as="audio" />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-gray-500">
          <Link href="/dictation" className="hover:text-blue-600 transition-colors">
            ← Danh sách bài tập
          </Link>
        </nav>

        <DictationPlayer exercise={exercise} sentences={sentences} />
      </div>
    </>
  );
}
