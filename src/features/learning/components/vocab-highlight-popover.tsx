"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { Volume2, Bookmark, Check, X, Loader2, Sparkles } from "lucide-react";
import { saveVocabAction } from "@/features/learning/vocabulary-actions";

interface WordData {
  word: string;
  phonetic?: string | null;
  audio?: string | null;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string | null;
      synonyms?: string[];
    }>;
  }>;
  collocations: string[];
  synonyms: string[];
}

export function VocabHighlightPopover() {
  const [selectedText, setSelectedText] = useState<string>("");
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();

  const popoverRef = useRef<HTMLDivElement>(null);

  // Lắng nghe sự kiện bôi đen từ trên trang
  useEffect(() => {
    function handleMouseUp() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const raw = selection.toString().trim();
      // Chỉ kích hoạt popover nếu là 1 từ hoặc cụm tối đa 2 từ tiếng Anh
      const clean = raw.replace(/^[.,\/#!$%\^&\*;:{}=\-_`~()?"'“”—]+|[.,\/#!$%\^&\*;:{}=\-_`~()?"'“”—]+$/g, "").trim();

      if (!clean || clean.length < 2 || clean.length > 35 || /\s{2,}/.test(clean) || clean.split(" ").length > 2) {
        return;
      }

      // Không mở đè nếu click bên trong popover
      if (popoverRef.current && popoverRef.current.contains(selection.anchorNode as Node)) {
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Đặt vị trí popover ngay trên vùng chọn
      const x = Math.min(Math.max(16, rect.left + rect.width / 2), window.innerWidth - 320);
      const y = rect.top + window.scrollY - 10;

      setSelectedText(clean);
      setCoords({ x, y });
      setIsOpen(true);
      setSaved(false);
      fetchWordDetails(clean);
    }

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // Đóng khi click ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  async function fetchWordDetails(term: string) {
    setLoading(true);
    setError(null);
    setWordData(null);

    try {
      const res = await fetch(`/api/dictionary/${encodeURIComponent(term.toLowerCase())}`);
      if (!res.ok) {
        setError("Không tìm thấy định nghĩa cho từ này.");
        return;
      }
      const data = await res.json();
      setWordData(data);
    } catch {
      setError("Không thể tải thông tin từ vựng lúc này.");
    } finally {
      setLoading(false);
    }
  }

  function handlePlayAudio() {
    if (wordData?.audio) {
      const audio = new Audio(wordData.audio);
      audio.play().catch(() => playSpeechFallback());
    } else {
      playSpeechFallback();
    }
  }

  function playSpeechFallback() {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(selectedText);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  }

  function handleSaveWord() {
    if (!selectedText || saved) return;
    startSaving(async () => {
      try {
        await saveVocabAction({ term: selectedText.toLowerCase() });
        setSaved(true);
      } catch (e) {
        console.error("Save error:", e);
      }
    });
  }

  if (!isOpen || !coords) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: "absolute",
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        transform: "translate(-50%, -100%)",
      }}
      className="z-50 w-80 max-w-[90vw] rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl backdrop-blur-md transition-all animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 text-lg capitalize truncate">
              {wordData?.word || selectedText}
            </span>
            <button
              type="button"
              onClick={handlePlayAudio}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
              title="Phát âm"
            >
              <Volume2 size={15} />
            </button>
          </div>
          {wordData?.phonetic ? (
            <p className="text-xs font-mono text-slate-500">{wordData.phonetic}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="my-3 max-h-56 overflow-y-auto space-y-2.5 text-xs text-slate-600 pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
            <Loader2 className="animate-spin text-emerald-500" size={20} />
            <span>Đang tra cứu từ điển...</span>
          </div>
        ) : error ? (
          <p className="py-3 text-center text-slate-400">{error}</p>
        ) : wordData ? (
          <>
            {wordData.meanings.slice(0, 2).map((meaning, idx) => (
              <div key={idx} className="space-y-1">
                <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 uppercase">
                  {meaning.partOfSpeech}
                </span>
                {meaning.definitions.slice(0, 2).map((def, dIdx) => (
                  <div key={dIdx} className="pl-1 border-l-2 border-emerald-400/50 space-y-0.5">
                    <p className="text-slate-800 font-medium leading-relaxed">{def.definition}</p>
                    {def.example ? (
                      <p className="italic text-slate-500 text-[11px]">"{def.example}"</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ))}

            {/* Collocations từ Datamuse */}
            {wordData.collocations && wordData.collocations.length > 0 ? (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 mb-1">
                  <Sparkles size={12} className="text-emerald-500" />
                  <span>Cụm từ hay đi kèm (Collocations):</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {wordData.collocations.slice(0, 5).map((col, cIdx) => (
                    <span
                      key={cIdx}
                      className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700 font-medium"
                    >
                      {col} {wordData.word}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {/* Footer Action */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">Từ điển Oxford / Datamuse</span>
        <button
          type="button"
          onClick={handleSaveWord}
          disabled={saved || isSaving}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
            saved
              ? "bg-slate-100 text-slate-600 cursor-default"
              : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-sm shadow-emerald-600/20"
          }`}
        >
          {saved ? (
            <>
              <Check size={13} />
              <span>Đã lưu sổ từ</span>
            </>
          ) : (
            <>
              <Bookmark size={13} />
              <span>{isSaving ? "Đang lưu..." : "Lưu vào sổ từ"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
