"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mic,
  Square,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { submitMockTestSectionAction } from "@/features/mock-tests/actions";
import type { MockRunnerContext } from "@/features/mock-tests/model";
import {
  createSpeakingUploadIntentAction,
  submitSpeakingAction,
  verifySpeakingUploadAction,
} from "@/features/speaking/actions";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ConfirmSubmitButton } from "@/components/shared/confirm-submit-button";
import type { SpeakingPracticeData } from "@/server/speaking/content";

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
  const [promptIndex, setPromptIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingsRef = useRef<Record<string, Recording>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submitKeyRef = useRef(crypto.randomUUID());
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

  if (!attempt) return null;
  const attemptId = attempt.id;

  async function startRecording(promptId: string, maximumSeconds: number) {
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
        1_000,
      );
      setActivePrompt(promptId);
      setMessage("Recording...");
      stopTimerRef.current = setTimeout(stopRecording, maximumSeconds * 1000);
    } catch {
      setMessage("Microphone access failed. Check your browser permission.");
    }
  }

  function stopRecording() {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function upload(promptId: string) {
    const recording = recordings[promptId];
    if (!recording) return;
    startTransition(async () => {
      setMessage("Preparing a private upload...");
      const result = await createSpeakingUploadIntentAction({
        attemptId,
        promptId,
        mimeType: recording.mimeType,
        sizeBytes: recording.blob.size,
        durationSeconds: recording.duration,
        idempotencyKey: crypto.randomUUID(),
      });
      if (result.status !== "ready") {
        setMessage(result.message);
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage
        .from(result.intent.bucketId)
        .upload(result.intent.storagePath, recording.blob, {
          contentType: recording.mimeType,
          upsert: false,
        });
      if (error) {
        setMessage(
          "Private upload failed. Your local recording is still available.",
        );
        return;
      }
      setMessage("Verifying the uploaded recording...");
      const verified = await verifySpeakingUploadAction({
        intentId: result.intent.intentId,
        setSlug: data.set.slug,
      });
      setMessage(verified.message);
      if (verified.status === "verified") router.refresh();
    });
  }

  const readyCount = data.prompts.filter((item) => item.verifiedAudio).length;
  const requiredCount = data.prompts.filter((item) => item.required).length;
  const prompt = data.prompts[promptIndex];
  if (!prompt) return null;
  const local = recordings[prompt.id];
  const isRecording = activePrompt === prompt.id;

  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl bg-[#fbf9ff] text-[#211b2a] lg:min-h-0 lg:rounded-3xl lg:border lg:border-[#e5dfef]">
      <header className="flex min-h-14 items-center gap-3 border-b border-[#e9e4f0] bg-white px-4 lg:rounded-t-3xl">
        <Link
          href="/practice/speaking"
          aria-label="Close recording"
          className="grid size-10 place-items-center rounded-full text-[#4d32d4]"
        >
          <X aria-hidden="true" size={18} />
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-bold text-[#736c7e] uppercase">
            Lesson {promptIndex + 1}
          </p>
          <p className="truncate text-xs font-bold">{data.set.title}</p>
        </div>
        <span className="w-10" aria-hidden="true" />
      </header>

      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col px-5 pb-6 sm:px-8">
        <div
          className="mt-4 flex justify-center gap-1.5"
          role="progressbar"
          aria-label="Speaking prompt progress"
          aria-valuemin={1}
          aria-valuemax={data.prompts.length}
          aria-valuenow={promptIndex + 1}
          aria-valuetext={`Prompt ${promptIndex + 1} of ${data.prompts.length}`}
        >
          {data.prompts.map((item, index) => (
            <span
              key={item.id}
              className={`h-1 rounded-full ${index === promptIndex ? "w-8 bg-[#4d32d4]" : item.verifiedAudio ? "w-4 bg-[#8ed8bd]" : "w-4 bg-[#ddd7e7]"}`}
            />
          ))}
        </div>

        <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="text-[10px] font-bold text-[#736c7e] uppercase">
            {prompt.part.replace("_", " ")}
          </p>
          <h1 className="mt-4 max-w-md text-2xl leading-tight font-bold text-[#3823bd]">
            {prompt.text}
          </h1>
          <p className="mt-3 max-w-sm text-xs leading-5 text-[#736c7e]">
            {prompt.instructions ||
              `Speak for ${prompt.minimumAnswerSeconds}-${prompt.maximumAnswerSeconds} seconds.`}
          </p>

          <div className="mt-6 min-h-12">
            {isRecording ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0ef] px-3 py-1.5 text-xs font-bold text-[#b53d38]">
                <span className="size-2 animate-pulse rounded-full bg-[#d94942]" />
                Recording
              </div>
            ) : prompt.verifiedAudio ? (
              <div className="rounded-full bg-[#e6f8ef] px-3 py-1.5 text-xs font-bold text-[#08754d]">
                Audio verified
              </div>
            ) : (
              <div className="rounded-full bg-[#f1edff] px-3 py-1.5 text-xs font-bold text-[#4d32d4]">
                Ready to record
              </div>
            )}
            <p
              role="timer"
              className="mt-2 font-mono text-sm font-bold text-[#4d32d4] tabular-nums"
            >
              {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:
              {String(recordingSeconds % 60).padStart(2, "0")}{" "}
              <span className="text-[#6b6476]">
                / 00:{String(prompt.maximumAnswerSeconds).padStart(2, "0")}
              </span>
            </p>
          </div>

          <div
            className="mt-6 flex h-12 items-end justify-center gap-1"
            aria-hidden="true"
          >
            {[12, 20, 15, 31, 18, 40, 24, 16, 36, 14, 27, 11].map(
              (height, index) => (
                <span
                  key={index}
                  className={`w-1.5 rounded-full bg-[#5b3ddd] ${isRecording ? "animate-pulse" : ""}`}
                  style={{ height }}
                />
              ),
            )}
          </div>

          <div className="mt-7 flex items-center gap-5">
            <button
              type="button"
              aria-label="Previous prompt"
              disabled={promptIndex === 0 || Boolean(activePrompt)}
              onClick={() => setPromptIndex((index) => Math.max(0, index - 1))}
              className="grid size-11 place-items-center rounded-full bg-[#eeeaf4] text-[#5e5769] disabled:opacity-35"
            >
              <ChevronLeft aria-hidden="true" size={20} />
            </button>
            <button
              type="button"
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              disabled={pending || Boolean(activePrompt && !isRecording)}
              onClick={() =>
                isRecording
                  ? stopRecording()
                  : startRecording(prompt.id, prompt.maximumAnswerSeconds)
              }
              className={`grid size-16 place-items-center rounded-full text-white shadow-[0_8px_24px_rgba(77,50,212,0.28)] transition active:scale-[0.96] ${isRecording ? "bg-[#d94942]" : "bg-[#4d32d4]"}`}
            >
              {isRecording ? (
                <Square aria-hidden="true" size={20} fill="currentColor" />
              ) : (
                <Mic aria-hidden="true" size={25} />
              )}
            </button>
            <button
              type="button"
              aria-label="Next prompt"
              disabled={
                promptIndex === data.prompts.length - 1 || Boolean(activePrompt)
              }
              onClick={() =>
                setPromptIndex((index) =>
                  Math.min(data.prompts.length - 1, index + 1),
                )
              }
              className="grid size-11 place-items-center rounded-full bg-[#eeeaf4] text-[#5e5769] disabled:opacity-35"
            >
              <ChevronRight aria-hidden="true" size={20} />
            </button>
          </div>

          {local ? (
            <div className="mt-7 w-full max-w-md rounded-2xl border border-[#e3ddec] bg-white p-4 text-left">
              <audio controls src={local.url} className="w-full">
                Your browser does not support audio.
              </audio>
              <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                <button
                  type="button"
                  disabled={pending || isRecording}
                  onClick={() => upload(prompt.id)}
                  className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#4d32d4] px-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  <UploadCloud aria-hidden="true" size={16} />
                  Upload & verify
                </button>
                <button
                  type="button"
                  aria-label="Delete local recording"
                  disabled={pending || isRecording}
                  onClick={() => {
                    URL.revokeObjectURL(local.url);
                    setRecordings((current) => {
                      const next = { ...current };
                      delete next[prompt.id];
                      recordingsRef.current = next;
                      return next;
                    });
                    setMessage("Local recording deleted.");
                  }}
                  className="grid size-11 place-items-center rounded-xl border border-[#ddd5e9] text-[#a43834]"
                >
                  <Trash2 aria-hidden="true" size={17} />
                </button>
              </div>
            </div>
          ) : prompt.verifiedAudio?.signedUrl ? (
            <audio
              controls
              preload="none"
              src={prompt.verifiedAudio.signedUrl}
              className="mt-7 w-full max-w-md"
            >
              Your browser does not support audio.
            </audio>
          ) : null}
          <p
            aria-live="polite"
            className="mt-4 min-h-5 max-w-md text-xs leading-5 text-[#736c7e]"
          >
            {message}
          </p>
        </section>

        <div className="rounded-2xl border border-[#e3ddec] bg-white p-4 shadow-[0_8px_24px_rgba(72,49,145,0.08)]">
          <div className="mb-3 flex items-center justify-between text-xs text-[#736c7e]">
            <span>
              {readyCount}/{requiredCount} required responses
            </span>
            <Clock3 aria-hidden="true" size={15} />
          </div>
          <ConfirmSubmitButton
            disabled={
              pending || readyCount < requiredCount || Boolean(activePrompt)
            }
            label="Finish Speaking"
            title="Submit this speaking practice?"
            description="Verified recordings will be locked to this attempt after submission."
            onConfirm={() =>
              startTransition(async () => {
                const result = mockContext
                  ? await submitMockTestSectionAction({
                      mockTestSlug: mockContext.mockTestSlug,
                      sessionId: mockContext.sessionId,
                      sectionAttemptId: mockContext.sectionAttemptId,
                      idempotencyKey: submitKeyRef.current,
                    })
                  : await submitSpeakingAction({
                      attemptId,
                      setSlug: data.set.slug,
                      idempotencyKey: submitKeyRef.current,
                    });
                if (result?.status === "error") setMessage(result.message);
              })
            }
            className="min-h-11 w-full rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
