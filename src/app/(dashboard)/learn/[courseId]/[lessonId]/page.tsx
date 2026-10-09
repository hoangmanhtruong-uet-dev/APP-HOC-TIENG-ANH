import { notFound } from "next/navigation";
import { requireCompletedOnboarding } from "@/features/onboarding/server/learner-profile";
import { VideoPlayer } from "@/features/learning/components/video-player";
import { LessonMarkdown } from "@/features/learning/components/lesson-markdown";
import { VocabHighlightPopover } from "@/features/learning/components/vocab-highlight-popover";

export default async function LessonPage(props: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await props.params;
  await requireCompletedOnboarding();
  
  if (!courseId || !lessonId) return notFound();

  return (
    <div className="p-8 max-w-4xl mx-auto flex flex-col space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Lesson {lessonId}</h1>
          <p className="text-zinc-600">Course: {courseId}</p>
        </div>
      </header>
      
      <div className="bg-black rounded-xl overflow-hidden shadow-lg">
        <VideoPlayer 
          lessonId={lessonId} 
          videoUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ" 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-8 mt-6">
        <VocabHighlightPopover />
        <LessonMarkdown>
          {`## Summary\n\nThis is a sample markdown content for lesson ${lessonId}. Select any text to save it to your vocabulary vault!`}
        </LessonMarkdown>
      </div>
    </div>
  );
}
