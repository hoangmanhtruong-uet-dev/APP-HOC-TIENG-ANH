import { useEffect, useRef, useState } from "react";

export function useAutosaveDraft<TAnswers extends Record<string, unknown>>(
  answers: TAnswers,
  onSaveDraft?: (answers: TAnswers) => Promise<boolean | void>,
  delayMs = 2000,
) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const answersRef = useRef(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!onSaveDraft) return;

    const timer = setTimeout(async () => {
      try {
        setSaveStatus("saving");
        const res = await onSaveDraft(answersRef.current);
        if (res !== false) {
          setSaveStatus("saved");
          setLastSavedAt(new Date());
        } else {
          setSaveStatus("error");
        }
      } catch {
        setSaveStatus("error");
      }
    }, delayMs);

    return () => clearTimeout(timer);
  }, [answers, onSaveDraft, delayMs]);

  const triggerSaveNow = async () => {
    if (!onSaveDraft) return;
    try {
      setSaveStatus("saving");
      const res = await onSaveDraft(answersRef.current);
      if (res !== false) {
        setSaveStatus("saved");
        setLastSavedAt(new Date());
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  return { saveStatus, lastSavedAt, triggerSaveNow };
}
