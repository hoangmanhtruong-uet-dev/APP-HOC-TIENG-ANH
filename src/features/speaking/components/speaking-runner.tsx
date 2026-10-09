"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Mic, Square, Trash2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";

import { GenericPracticeEngine } from "@/features/core-practice";
import { submitMockTestSectionAction } from "@/features/mock-tests/actions";
import type { MockRunnerContext } from "@/features/mock-tests/model";
import { submitSpeakingAction } from "@/features/speaking/actions";
import {
  getR2UploadUrlAction,
  saveR2AudioAction,
  uploadR2AudioFallbackAction,
} from "@/features/speaking/r2-actions";
import type { SpeakingPracticeData } from "@/features/speaking/server/content";
import { cn } from "@/lib/utils";

type Recording = {
  blob: Blob;
  url: string;
  duration: number;
  mimeType: "audio/webm" | "audio/mp4" | "audio/mpeg";
};

export function SpeakingRunner({
  data,
  mockContext,
}: {
  data: SpeakingPracticeData;
  mockContext?: MockRunnerContext;
}) {
  const router = useRouter();
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Record<string, Recording>>({});
  const [message, setMessage] = useState("");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pending, startTransition] = useTransition();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingsRef = useRef<Record<string, Recording>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const attempt = data.attempt;

  useEffect(
    () => () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      Object.values(recordingsRef.current).forEach((recording) =>
        URL.revokeObjectURL(recording.url),
      );
    },
    [],
  );

  const attemptId = attempt?.id ?? "";

  const startRecording = async (promptId: string, maximumSeconds: number) => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMessage("This browser does not support secure audio recording.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/mpeg",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!preferred) {
        stream.getTracks().forEach((track) => track.stop());
        setMessage("No supported audio format was found.");
        return;
      }
      const recorder = new MediaRecorder(stream, { mimeType: preferred });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstart = (event) => {
        startedAtRef.current = event.timeStamp;
      };
      recorder.onstop = (event) => {
        const mimeType = preferred.startsWith("audio/webm")
          ? "audio/webm"
          : (preferred as Recording["mimeType"]);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Math.min(
          maximumSeconds,
          Math.max(0, (event.timeStamp - startedAtRef.current) / 1000),
        );
        const url = URL.createObjectURL(blob);
        setRecordings((current) => {
          if (current[promptId]) URL.revokeObjectURL(current[promptId].url);
          const next = {
            ...current,
            [promptId]: { blob, url, duration, mimeType },
          };
          recordingsRef.current = next;
          return next;
        });
        stream.getTracks().forEach((track) => track.stop());
        setActivePrompt(null);
        setMessage(
          "Recording saved on this device. Upload it for verification.",
        );
      };
      recorderRef.current = recorder;
      streamRef.current = stream;
      recorder.start(250);
      setRecordingSeconds(0);
      elapsedTimerRef.current = setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000,
      );
      setActivePrompt(promptId);
      setMessage("Recording...");
      stopTimerRef.current = setTimeout(stopRecording, maximumSeconds * 1000);
    } catch {
      setMessage("Microphone access failed. Check your browser permission.");
    }
  };

  const stopRecording = () => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  };

  const upload = (promptId: string) => {
    const recording = recordings[promptId];
    if (!recording) return;

    if (recording.blob.size > 5 * 1024 * 1024) {
      setMessage("Dung lượng audio vượt quá giới hạn 5MB.");
      return;
    }
    if (recording.duration < 2 || recording.duration > 120) {
      setMessage("Thời lượng audio phải từ 2 giây đến 2 phút.");
      return;
    }

    startTransition(async () => {
      setMessage("Đang tải audio lên R2...");
      const result = await getR2UploadUrlAction(recording.mimeType);

      if (result.status !== "success") {
        setMessage(result.message);
        return;
      }

      try {
        const uploadRes = await fetch(result.uploadUrl, {
          method: "PUT",
          body: recording.blob,
          headers: {
            "Content-Type": recording.mimeType,
          },
        });

        if (!uploadRes.ok) throw new Error("HTTP error " + uploadRes.status);

        const saveRes = await saveR2AudioAction(
          attemptId,
          promptId,
          result.fileKey,
          recording.mimeType,
          recording.blob.size,
          recording.duration,
        );
        if (saveRes.status === "error") {
          setMessage(saveRes.message);
          return;
        }

        setMessage("Audio đã được ghi nhận thành công!");
        router.refresh();
      } catch {
        setMessage("Đang thử tải lên qua máy chủ dự phòng...");
        try {
          const formData = new FormData();
          formData.append("file", recording.blob, `audio.webm`);
          formData.append("attemptId", attemptId);
          formData.append("promptId", promptId);
          formData.append("mimeType", recording.mimeType);
          formData.append("duration", String(recording.duration));

          const fallbackRes = await uploadR2AudioFallbackAction(formData);
          if (fallbackRes.status === "success") {
            setMessage("Audio đã được ghi nhận thành công!");
            router.refresh();
          } else {
            setMessage(fallbackRes.message || "Lỗi kết nối khi tải audio lên.");
          }
        } catch {
          setMessage("Lỗi kết nối khi tải audio lên. Vui lòng thử lại.");
        }
      }
    });
  };

  const handleSubmit = useCallback(async () => {
    startTransition(async () => {
      if (mockContext) {
        await submitMockTestSectionAction({
          mockTestSlug: mockContext.mockTestSlug,
          sessionId: mockContext.sessionId,
          sectionAttemptId: mockContext.sectionAttemptId,
          idempotencyKey: crypto.randomUUID(),
        });
      } else {
        await submitSpeakingAction({
          attemptId,
          setSlug: data.set.slug,
          idempotencyKey: crypto.randomUUID(),
        });
      }
    });
  }, [attemptId, data.set.slug, mockContext]);

  const questions = data.prompts.map((p) => ({
    id: p.id,
    promptMarkdown: p.text,
  }));

  if (!attempt) return null;

  return (
    <GenericPracticeEngine
      title={data.set.title}
      domain="speaking"
      categoryLabel="Speaking Practice"
      questions={questions}
      isSubmitting={pending}
      onSubmit={handleSubmit}
      renderSidePanel={() => (
        <div className="flex flex-col h-full justify-center items-center p-8 bg-white text-center">
          <h2 className="text-2xl font-black text-slate-800 mb-4">Speaking Instructions</h2>
          <p className="text-slate-600 max-w-md leading-relaxed">
            Record your audio response for each question using your microphone. Make sure you speak clearly within the maximum allowed time limit.
          </p>
        </div>
      )}
      renderQuestionArea={({ currentQuestion }) => {
        const prompt = data.prompts.find((p) => p.id === currentQuestion.id);
        if (!prompt) return null;
        const local = recordings[prompt.id];
        const isRecording = activePrompt === prompt.id;

        return (
          <div className="space-y-6 max-w-xl mx-auto text-center">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                {prompt.part.replace("_", " ")}
              </h2>
              <p className="text-slate-800 text-xl font-black mb-4 leading-relaxed">
                {prompt.text}
              </p>
              <p className="text-slate-500 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                {prompt.instructions ||
                  `Speak for ${prompt.minimumAnswerSeconds}-${prompt.maximumAnswerSeconds} seconds.`}
              </p>
            </div>

            {message ? (
              <p aria-live="polite" className="text-xs font-bold text-indigo-600">
                {message}
              </p>
            ) : null}

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col items-center justify-center min-h-[300px]">
              <div className="relative mb-6">
                {isRecording ? (
                  <div className="absolute -inset-4 bg-rose-500/20 rounded-full animate-ping" />
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    isRecording
                      ? stopRecording()
                      : startRecording(prompt.id, prompt.maximumAnswerSeconds)
                  }
                  disabled={pending || Boolean(activePrompt && !isRecording)}
                  className={cn(
                    "relative z-10 h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg disabled:opacity-50",
                    isRecording
                      ? "bg-slate-900 text-rose-500 hover:bg-slate-800"
                      : "bg-rose-500 text-white hover:bg-rose-600",
                  )}
                >
                  {isRecording ? <Square size={28} /> : <Mic size={36} />}
                </button>
              </div>

              <div className="text-lg font-bold text-slate-600 font-mono">
                {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:
                {String(recordingSeconds % 60).padStart(2, "0")}{" "}
                <span className="text-slate-400">
                  / 00:{String(prompt.maximumAnswerSeconds).padStart(2, "0")}
                </span>
              </div>

              {local ? (
                <div className="mt-6 w-full">
                  <audio controls src={local.url} className="w-full h-10" />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => upload(prompt.id)}
                      disabled={pending || isRecording}
                      className="flex-1 bg-sky-600 text-white font-bold py-2.5 rounded-xl hover:bg-sky-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <UploadCloud size={16} /> Nộp audio
                    </button>
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(local.url);
                        setRecordings((c) => {
                          const n = { ...c };
                          delete n[prompt.id];
                          recordingsRef.current = n;
                          return n;
                        });
                      }}
                      disabled={pending || isRecording}
                      className="px-4 bg-rose-50 text-rose-600 font-bold py-2.5 rounded-xl hover:bg-rose-100 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ) : prompt.verifiedAudio?.signedUrl ? (
                <audio
                  controls
                  preload="none"
                  src={prompt.verifiedAudio.signedUrl}
                  className="mt-6 w-full h-10"
                />
              ) : null}
            </div>
          </div>
        );
      }}
    />
  );
}
