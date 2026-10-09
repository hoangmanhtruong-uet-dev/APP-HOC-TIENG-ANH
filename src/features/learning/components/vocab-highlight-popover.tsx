"use client";

import { useEffect, useState, useRef } from "react";
import { BookMarked, Volume2, Languages, X } from "lucide-react";

interface PopoverState {
  text: string;
  x: number;
  y: number;
  visible: boolean;
}

export function VocabHighlightPopover() {
  const [popover, setPopover] = useState<PopoverState>({ text: "", x: 0, y: 0, visible: false });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Don't trigger if clicking inside the popover
      if (popoverRef.current?.contains(e.target as Node)) {
        return;
      }

      setTimeout(() => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0 && text.length < 50) { // Limit length for vocab
          const range = selection?.getRangeAt(0);
          const rect = range?.getBoundingClientRect();

          if (rect) {
            setPopover({
              text,
              x: rect.left + rect.width / 2,
              y: rect.top - 10,
              visible: true,
            });
          }
        } else {
          setPopover((p) => ({ ...p, visible: false }));
        }
      }, 10);
    };

    document.addEventListener("mouseup", handleMouseUp);
    // Also hide on scroll
    document.addEventListener("scroll", () => setPopover(p => ({...p, visible: false})), true);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("scroll", () => {});
    };
  }, []);

  if (!popover.visible) return null;

  const handleSave = () => {
    // Action to save to Vocab Vault
    alert(`Đã lưu từ: ${popover.text}`);
    setPopover(p => ({...p, visible: false}));
  };

  const handleListen = () => {
    const utterance = new SpeechSynthesisUtterance(popover.text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-100 flex items-center gap-1 p-1 bg-zinc-950 dark:bg-zinc-800 text-zinc-100 rounded-lg shadow-xl border border-zinc-800 dark:border-zinc-700"
      style={{
        left: popover.x,
        top: popover.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      {/* Little triangle pointer */}
      <div className="absolute left-1/2 bottom-0 w-2 h-2 bg-zinc-950 dark:bg-zinc-800 border-r border-b border-zinc-800 dark:border-zinc-700 transform -translate-x-1/2 translate-y-1/2 rotate-45"></div>
      
      <button 
        onClick={handleListen}
        className="p-1.5 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors"
        title="Nghe phát âm"
      >
        <Volume2 className="w-4 h-4" />
      </button>
      <button 
        className="p-1.5 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors"
        title="Dịch nghĩa"
      >
        <Languages className="w-4 h-4" />
      </button>
      <button 
        onClick={handleSave}
        className="p-1.5 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors flex items-center gap-1 text-sm pr-2"
        title="Lưu vào sổ tay"
      >
        <BookMarked className="w-4 h-4" />
        <span className="hidden sm:inline">Lưu</span>
      </button>
      
      <div className="w-px h-4 bg-zinc-800 mx-0.5"></div>
      
      <button 
        onClick={() => setPopover(p => ({...p, visible: false}))}
        className="p-1 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded-md transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
