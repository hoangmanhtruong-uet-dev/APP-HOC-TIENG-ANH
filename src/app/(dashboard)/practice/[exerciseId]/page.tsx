import { notFound } from "next/navigation";
import { requireCompletedOnboarding } from "@/features/onboarding/server/learner-profile";
import { GenericPracticeEngine } from "@/features/core-practice/components/generic-practice-engine";

export default async function PracticePage(props: {
  params: Promise<{ exerciseId: string }>;
}) {
  const { exerciseId } = await props.params;
  await requireCompletedOnboarding();
  
  if (!exerciseId) return notFound();

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto h-full">
      <GenericPracticeEngine
        title={`Exercise ${exerciseId}`}
        domain="reading"
        categoryLabel="Practice"
        questions={[{ id: "1", question_type: "multiple_choice", order_index: 1 }]}
        initialAnswers={{}}
        renderQuestionArea={({ currentQuestion }) => <div>Question {currentQuestion.id}</div>}
      />
    </div>
  );
}
