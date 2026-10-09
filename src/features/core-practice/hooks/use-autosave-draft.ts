import { useCallback, useEffect, useRef, useState } from "react";
import localforage from "localforage";
import { saveExerciseDraftAction } from "../api/save-draft-action";

export function useAutosaveDraft({
  attemptId,
  answers,
  intervalMs = 5000,
  enabled = true,
}: {
  attemptId: string;
  answers: Record<string, string | string[] | Record<string, string>>;
  intervalMs?: number;
  enabled?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error" | "offline_saved">("idle");
  const [isOnline, setIsOnline] = useState(true);
  const lastSavedAnswersRef = useRef(JSON.stringify(answers));
  const answersRef = useRef(answers);

  // Initialize network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keep ref up to date to avoid dependency changes in effect
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const saveDraft = useCallback(async () => {
    if (!enabled || !attemptId) return;

    const currentAnswersString = JSON.stringify(answersRef.current);
    if (currentAnswersString === lastSavedAnswersRef.current) {
      // Nothing changed
      return;
    }

    setStatus("saving");
    try {
      if (!isOnline) {
        // Offline: save to localforage
        await localforage.setItem(`draft_${attemptId}`, answersRef.current);
        lastSavedAnswersRef.current = currentAnswersString;
        setStatus("offline_saved");
        return;
      }

      const res = await saveExerciseDraftAction({
        attemptId,
        answers: answersRef.current,
      });

      if (res.success) {
        lastSavedAnswersRef.current = currentAnswersString;
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
        // Clear local draft once synced
        await localforage.removeItem(`draft_${attemptId}`);
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error("Draft save error:", err);
      // Fallback to localforage on error
      await localforage.setItem(`draft_${attemptId}`, answersRef.current);
      setStatus("offline_saved");
    }
  }, [attemptId, enabled, isOnline]);

  // Sync offline drafts when coming back online
  useEffect(() => {
    if (isOnline && enabled) {
      localforage.getItem(`draft_${attemptId}`).then((localDraft) => {
        if (localDraft) {
          saveDraft(); // Will sync localDraft because answersRef should contain it or newer
        }
      });
    }
  }, [isOnline, attemptId, enabled, saveDraft]);

  // Periodic autosave
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(saveDraft, intervalMs);
    return () => clearInterval(interval);
  }, [saveDraft, intervalMs, enabled]);

  // Save on page hide/unload
  useEffect(() => {
    if (!enabled) return;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        saveDraft();
      }
    };

    const handleBeforeUnload = () => {
      saveDraft();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [saveDraft, enabled]);

  return { status, forceSave: saveDraft };
}
