"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getErrorNotebookAction() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Unauthorized", data: [] };

  // Fetch incorrect answers
  // We will join with exercise_questions to get the prompt
  // Since we don't have a direct error notebook schema, we just use a join.
  // Note: For actual production, a dedicated view or table might be better.
  
  const { data, error } = await supabase
    .from("learner_answers")
    .select(`
      id,
      answer_text,
      created_at,
      question_id,
      is_correct,
      exercise_questions!inner (
        prompt_markdown,
        question_type,
        exercise_set_versions!inner (
          title,
          skill
        )
      )
    `)
    .eq("is_correct", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error(error);
    return { success: false, error: error.message, data: [] };
  }

  // Format into something similar to MOCK_ENTRIES
  const formattedData = data.map((d: any, idx: number) => ({
    id: d.id,
    skill: d.exercise_questions.exercise_set_versions.skill || "Reading",
    source: d.exercise_questions.exercise_set_versions.title || "Exercise",
    savedOn: new Date(d.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }),
    failCount: 1, // simplified
    failLabel: "Failed 1 time",
    question: d.exercise_questions.prompt_markdown || `Question ${d.question_id}`,
    yourAnswer: d.answer_text || "(No answer)",
    correctAnswer: "Check the lesson for correct answer",
    errorType: "Needs Review",
    aiBreakdown: "Focus on understanding the core concept required to solve this type of question.",
    status: "Needs Practice",
    statusColor: "text-rose-600",
    note: "",
    bookmarked: false,
    skillColor: "bg-indigo-50 text-indigo-700 border-indigo-100", // Default
  }));

  return { success: true, data: formattedData };
}
