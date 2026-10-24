"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./dictation.css";

export interface DictationLesson {
  id: string;
  cat: string;
  lv: "Cơ bản" | "Trung bình" | "Nâng cao";
  title: string;
  desc: string;
  dur: string;
  s: string[];
  custom?: boolean;
}

const BASE_LESSONS: DictationLesson[] = [
  {
    id: "cafe",
    cat: "Giao tiếp",
    lv: "Cơ bản",
    title: "Daily Conversation: At the Coffee Shop",
    desc: "Luyện nghe đoạn hội thoại tại quán cà phê. Phù hợp cho người mới bắt đầu.",
    dur: "0:45",
    s: [
      "Hi, can I get a medium latte, please?",
      "Sure, would you like that hot or iced?",
      "Hot, please, and with oat milk instead of regular.",
      "That will be five dollars and fifty cents.",
      "Thanks, I will wait over there by the window.",
    ],
  },
  {
    id: "dir",
    cat: "Giao tiếp",
    lv: "Cơ bản",
    title: "Asking for Directions",
    desc: "Hỏi đường và chỉ đường trong thành phố, câu ngắn và rõ ràng.",
    dur: "0:40",
    s: [
      "Excuse me, how do I get to the train station?",
      "Go straight for two blocks and turn left at the bank.",
      "Is it far from here, or can I walk?",
      "It takes about ten minutes on foot.",
    ],
  },
  {
    id: "gen",
    cat: "Tổng hợp",
    lv: "Cơ bản",
    title: "Everyday Life",
    desc: "Các câu thường gặp về thói quen, gia đình và kế hoạch cuối tuần.",
    dur: "0:50",
    s: [
      "I usually wake up at six and go for a short walk.",
      "My brother works in a bank near the city center.",
      "We are planning a trip to the mountains this weekend.",
      "She forgot her umbrella, so she got wet on the way home.",
      "It is a lot cheaper to cook at home than to eat out.",
    ],
  },
  {
    id: "off",
    cat: "Công sở",
    lv: "Trung bình",
    title: "Office Meeting Talk",
    desc: "Cụm từ họp hành: báo cáo, lịch hẹn, hạn chót và đề xuất.",
    dur: "1:10",
    s: [
      "Let's go over the quarterly report before the meeting starts.",
      "I'll send you the updated figures by the end of the day.",
      "Could we reschedule the call to Thursday afternoon?",
      "The deadline has been moved to the first of next month.",
      "Please let me know if you have any questions about the proposal.",
    ],
  },
  {
    id: "news",
    cat: "Tin tức",
    lv: "Trung bình",
    title: "City News Bulletin",
    desc: "Bản tin ngắn về giao thông công cộng, giọng đọc tin tức rõ ràng.",
    dur: "1:00",
    s: [
      "The city council approved a new plan to expand public transport.",
      "Officials expect construction to begin early next year.",
      "Residents have welcomed the decision, citing heavy traffic.",
      "The project is estimated to cost around two hundred million dollars.",
    ],
  },
  {
    id: "int",
    cat: "Công sở",
    lv: "Nâng cao",
    title: "Job Interview",
    desc: "Câu hỏi và trả lời phỏng vấn, từ vựng nghề nghiệp nâng cao.",
    dur: "1:15",
    s: [
      "Tell me about a time you worked under pressure.",
      "I managed a team of five during a tight product launch.",
      "What do you consider your greatest professional strength?",
      "I believe my adaptability helps me solve problems quickly.",
    ],
  },
  {
    id: "aca",
    cat: "Học thuật",
    lv: "Nâng cao",
    title: "Sleep and Memory Study",
    desc: "Đoạn nghiên cứu khoa học: từ vựng học thuật, câu dài, liên từ phức.",
    dur: "1:20",
    s: [
      "Researchers have found a strong correlation between sleep quality and memory retention.",
      "The study followed two hundred participants over a period of three years.",
      "Although the results are promising, further investigation is required.",
      "Climate change has significantly altered migration patterns in many bird species.",
    ],
  },
];

const CATEGORIES = ["Tất cả", "Tổng hợp", "Giao tiếp", "Công sở", "Học thuật", "Tin tức"];
const LEVELS = ["Tất cả", "Cơ bản", "Trung bình", "Nâng cao"] as const;

const LEVEL_COLORS: Record<string, string> = {
  "Cơ bản": "#5EE0A0",
  "Trung bình": "#F5B73D",
  "Nâng cao": "#FF6A82",
};

interface SentenceResult {
  acc: number;
  revealed?: boolean;
  missed: string[];
  html: string;
}

interface DiffOp {
  t: "ok" | "miss" | "extra";
  w: string;
  c?: string;
}

function cleanWord(w: string) {
  return w.replace(/[’‘]/g, "'").toLowerCase().replace(/[^a-z0-9']/g, "");
}

function splitWords(s: string) {
  return s.trim().split(/\s+/).filter(Boolean);
}

// LCS-based Diff Alignment
function alignDiff(targetWords: string[], userWords: string[]): DiffOp[] {
  const T = targetWords.map(cleanWord);
  const A = userWords.map(cleanWord);
  const n = T.length;
  const m = A.length;
  const d = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      d[i][j] = T[i] === A[j] ? d[i + 1][j + 1] + 1 : Math.max(d[i + 1][j], d[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (T[i] === A[j]) {
      ops.push({ t: "ok", w: targetWords[i] });
      i++;
      j++;
    } else if (d[i + 1][j] >= d[i][j + 1]) {
      ops.push({ t: "miss", w: targetWords[i], c: T[i] });
      i++;
    } else {
      ops.push({ t: "extra", w: userWords[j] });
      j++;
    }
  }

  while (i < n) {
    ops.push({ t: "miss", w: targetWords[i], c: T[i] });
    i++;
  }
  while (j < m) {
    ops.push({ t: "extra", w: userWords[j] });
    j++;
  }

  return ops;
}

function makeBlanks(sentence: string): number[] {
  const w = splitWords(sentence);
  let el = w
    .map((x, i) => [i, cleanWord(x).length] as [number, number])
    .filter((x) => x[1] >= 4)
    .map((x) => x[0]);
  if (!el.length) {
    const best = w
      .map((x, i) => [i, cleanWord(x).length] as [number, number])
      .sort((a, b) => b[1] - a[1])[0];
    el = [best[0]];
  }
  return el.filter((_, k) => k % 2 === 0 || el.length === 1);
}

function getAccClass(acc: number) {
  return acc >= 80 ? "g" : acc >= 50 ? "y" : "r";
}

function normalizeSearch(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

export function DictationClient() {
  // Main view: 'lib' | 'play' | 'result'
  const [view, setView] = useState<"lib" | "play" | "result">("lib");

  // Local storage state
  const [prog, setProg] = useState<Record<string, { best: number; last: number }>>({});
  const [stats, setStats] = useState({ n: 0, sum: 0 });
  const [notes, setNotes] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<DictationLesson[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("Tất cả");
  const [selectedLv, setSelectedLv] = useState<string>("Tất cả");

  // Player state
  const [activeLesson, setActiveLesson] = useState<DictationLesson | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mode, setMode] = useState<"full" | "cloze">("full");
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [replays, setReplays] = useState(0);
  const [hints, setHints] = useState(0);
  const [hintN, setHintN] = useState(0);
  const [playerStatus, setPlayerStatus] = useState<"ask" | "checked">("ask");
  const [currentResult, setCurrentResult] = useState<SentenceResult | null>(null);
  const [results, setResults] = useState<SentenceResult[]>([]);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedSecs, setElapsedSecs] = useState(0);

  // Input states
  const [fullInput, setFullInput] = useState("");
  const [clozeInputs, setClozeInputs] = useState<Record<number, string>>({});

  // Modals state
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [newError, setNewError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedProg = localStorage.getItem("dict.prog");
      if (savedProg) setProg(JSON.parse(savedProg));
      const savedStats = localStorage.getItem("dict.stats");
      if (savedStats) setStats(JSON.parse(savedStats));
      const savedNotes = localStorage.getItem("dict.notes");
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      const savedMine = localStorage.getItem("dict.mine");
      if (savedMine) setMine(JSON.parse(savedMine));
    } catch {
      // Fallback
    }
  }, []);

  // Save changes
  const saveProg = (newProg: Record<string, { best: number; last: number }>) => {
    setProg(newProg);
    try {
      localStorage.setItem("dict.prog", JSON.stringify(newProg));
    } catch {}
  };

  const saveStats = (newStats: { n: number; sum: number }) => {
    setStats(newStats);
    try {
      localStorage.setItem("dict.stats", JSON.stringify(newStats));
    } catch {}
  };

  const saveNotes = (newNotes: Record<string, number>) => {
    setNotes(newNotes);
    try {
      localStorage.setItem("dict.notes", JSON.stringify(newNotes));
    } catch {}
  };

  const saveMine = (newMine: DictationLesson[]) => {
    setMine(newMine);
    try {
      localStorage.setItem("dict.mine", JSON.stringify(newMine));
    } catch {}
  };

  // Lessons list
  const allLessons = useMemo(() => [...BASE_LESSONS, ...mine], [mine]);

  // Audio Speech synthesis
  const say = useCallback(
    (text: string, r: number = speed) => {
      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window) ||
        typeof SpeechSynthesisUtterance === "undefined"
      ) {
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = r;
      const voices = window.speechSynthesis.getVoices();
      const prefVoice =
        voices.find((v) => /^en[-_]US/i.test(v.lang) && (v.name.includes("Google") || v.name.includes("Siri"))) ||
        voices.find((v) => /^en/i.test(v.lang));
      if (prefVoice) u.voice = prefVoice;

      u.onstart = () => setIsPlaying(true);
      u.onend = u.onerror = () => setIsPlaying(false);
      window.speechSynthesis.speak(u);
    },
    [speed]
  );

  // Filter lessons
  const filteredLessons = useMemo(() => {
    return allLessons.filter((l) => {
      const matchCat =
        selectedCat === "Tất cả" || (selectedCat === "Của tôi" ? l.custom : l.cat === selectedCat);
      const matchLv = selectedLv === "Tất cả" || l.lv === selectedLv;
      const matchQ =
        !searchQuery ||
        normalizeSearch(`${l.title} ${l.desc} ${l.cat}`).includes(normalizeSearch(searchQuery));
      return matchCat && matchLv && matchQ;
    });
  }, [allLessons, selectedCat, selectedLv, searchQuery]);

  // Start a lesson
  const startLesson = (lesson: DictationLesson) => {
    setActiveLesson(lesson);
    setCurrentIdx(0);
    setResults([]);
    setReplays(0);
    setHints(0);
    setHintN(0);
    setPlayerStatus("ask");
    setCurrentResult(null);
    setFullInput("");
    setClozeInputs({});
    setStartTime(Date.now());
    setView("play");
  };

  // Play audio when entering sentence
  useEffect(() => {
    if (view === "play" && activeLesson && playerStatus === "ask") {
      const sent = activeLesson.s[currentIdx];
      const timer = setTimeout(() => {
        say(sent, speed);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [view, activeLesson, currentIdx, playerStatus, say, speed]);

  // Handle replay audio
  const handleReplay = () => {
    if (!activeLesson) return;
    setReplays((prev) => prev + 1);
    say(activeLesson.s[currentIdx], speed);
  };

  // Handle hint
  const handleHint = () => {
    if (!activeLesson) return;
    const sent = activeLesson.s[currentIdx];
    const totalWords = splitWords(sent).length;
    if (hintN < totalWords) {
      setHintN((prev) => prev + 1);
      setHints((prev) => prev + 1);
    }
  };

  // Handle check answer
  const handleCheck = () => {
    if (!activeLesson) return;
    const sent = activeLesson.s[currentIdx];
    const tw = splitWords(sent);
    let acc = 0;
    let missed: string[] = [];
    let html = "";

    if (mode === "full") {
      if (!fullInput.trim()) {
        inputRef.current?.focus();
        return;
      }
      const uw = splitWords(fullInput);
      const ops = alignDiff(tw, uw);
      const okCount = ops.filter((o) => o.t === "ok").length;
      const extraCount = ops.filter((o) => o.t === "extra").length;
      const missCount = ops.filter((o) => o.t === "miss").length;
      acc = Math.round((100 * okCount) / (okCount + missCount + extraCount)) || 0;
      missed = ops.filter((o) => o.t === "miss" && (o.c?.length ?? 0) >= 2).map((o) => o.c as string);
      html = ops
        .map(
          (o) =>
            `<span class="w ${o.t}">${o.w}</span>`
        )
        .join("");
    } else {
      const blanks = makeBlanks(sent);
      let good = 0;
      const mapped: Record<number, { ok: boolean; typed: string; core: string }> = {};

      blanks.forEach((k) => {
        const core = tw[k].replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "");
        const typed = clozeInputs[k] || "";
        const isOk = cleanWord(typed) === cleanWord(core);
        if (isOk) good++;
        else missed.push(cleanWord(core));
        mapped[k] = { ok: isOk, typed: typed.trim(), core };
      });

      acc = Math.round((100 * good) / blanks.length) || 0;
      html = tw
        .map((w, k) => {
          const m = mapped[k];
          if (!m) return `<span class="w plain">${w}</span>`;
          const mm = w.match(/^([^A-Za-z0-9']*)(.*?)([^A-Za-z0-9']*)$/);
          const prefix = mm ? mm[1] : "";
          const core = mm ? mm[2] : w;
          const suffix = mm ? mm[3] : "";
          return m.ok
            ? `<span class="w ok">${w}</span>`
            : `<span class="w">${m.typed ? `<span class="w extra">${m.typed}</span> ` : ""}<span class="w miss">${core}</span>${suffix}</span>`;
        })
        .join(" ");
    }

    const res: SentenceResult = { acc, html, missed };
    setCurrentResult(res);
    setPlayerStatus("checked");

    if (acc === 100) {
      say("Correct", 1.1);
    }
  };

  // Reveal answer
  const handleReveal = () => {
    if (!activeLesson) return;
    const sent = activeLesson.s[currentIdx];
    const res: SentenceResult = {
      acc: 0,
      revealed: true,
      missed: [],
      html: `<span class="w plain">${sent}</span>`,
    };
    setCurrentResult(res);
    setPlayerStatus("checked");
  };

  // Advance to next sentence or finish
  const handleNext = () => {
    if (!activeLesson || !currentResult) return;
    const updatedResults = [...results, currentResult];
    setResults(updatedResults);

    if (currentIdx < activeLesson.s.length - 1) {
      setCurrentIdx((prev) => prev + 1);
      setPlayerStatus("ask");
      setHintN(0);
      setFullInput("");
      setClozeInputs({});
      setCurrentResult(null);
    } else {
      // Finished all sentences!
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      const sum = updatedResults.reduce((acc, r) => acc + r.acc, 0);
      const avg = Math.round(sum / updatedResults.length) || 0;

      // Update stats
      const newStats = {
        n: stats.n + updatedResults.length,
        sum: stats.sum + sum,
      };
      saveStats(newStats);

      // Update prog
      const existingBest = prog[activeLesson.id]?.best ?? 0;
      const newProg = {
        ...prog,
        [activeLesson.id]: {
          best: Math.max(avg, existingBest),
          last: avg,
        },
      };
      saveProg(newProg);

      setElapsedSecs(Math.round((Date.now() - startTime) / 1000));
      setView("result");
    }
  };

  // Global hotkeys
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isNewOpen || isNotesOpen) return;
      if (view === "play") {
        if (e.altKey && e.key.toLowerCase() === "r" && playerStatus !== "checked") {
          e.preventDefault();
          handleReplay();
        }
        if (e.altKey && e.key.toLowerCase() === "h" && playerStatus === "ask") {
          e.preventDefault();
          handleHint();
        }
        if (
          e.key === "Enter" &&
          playerStatus === "checked" &&
          (document.activeElement?.tagName !== "BUTTON" || document.activeElement.id === "bNext")
        ) {
          e.preventDefault();
          handleNext();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [view, isNewOpen, isNotesOpen, playerStatus, handleReplay, handleHint, handleNext]);

  // Create custom lesson
  const handleCreateLesson = () => {
    const rawText = newText.replace(/\s+/g, " ").trim();
    const sentences = (rawText.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [])
      .map((x) => x.trim())
      .filter((x) => splitWords(x).length >= 3)
      .slice(0, 30);

    if (sentences.length < 1) {
      setNewError("Cần ít nhất một câu có từ 3 từ trở lên.");
      return;
    }

    const totalWords = sentences.reduce((a, s) => a + splitWords(s).length, 0);
    const avgW = totalWords / sentences.length;
    const durSecs = Math.round(totalWords / 2.5);
    const mm = Math.floor(durSecs / 60);
    const ss = String(durSecs % 60).padStart(2, "0");
    const dur = `${mm}:${ss}`;

    const title = newTitle.trim() || `Bài của tôi ${mine.length + 1}`;
    const lv = avgW < 8 ? "Cơ bản" : avgW < 13 ? "Trung bình" : "Nâng cao";

    const newLesson: DictationLesson = {
      id: "u" + Date.now(),
      custom: true,
      cat: "Của tôi",
      lv,
      title,
      desc: `Bài tự tạo gồm ${sentences.length} câu.`,
      dur,
      s: sentences,
    };

    saveMine([...mine, newLesson]);
    setNewTitle("");
    setNewText("");
    setNewError("");
    setIsNewOpen(false);
    setSelectedCat("Của tôi");
    setSelectedLv("Tất cả");
    setSearchQuery("");
  };

  // Delete custom lesson
  const handleDeleteLesson = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Xoá bài này?")) {
      const updatedMine = mine.filter((m) => m.id !== id);
      saveMine(updatedMine);
      const updatedProg = { ...prog };
      delete updatedProg[id];
      saveProg(updatedProg);
      if (updatedMine.length === 0 && selectedCat === "Của tôi") {
        setSelectedCat("Tất cả");
      }
    }
  };

  // Compute category categories list
  const categoryList = useMemo(() => {
    return [...CATEGORIES, ...(mine.length ? ["Của tôi"] : [])];
  }, [mine.length]);

  // Overall stats
  const avgAccuracy = stats.n ? `${Math.round(stats.sum / stats.n)}%` : "–";
  const completedLessonsCount = Object.values(prog).filter((p) => p.best >= 0).length;

  return (
    <div className="dictation-scope">
      {/* VIEW 1: LIBRARY */}
      {view === "lib" ? (
        <main className="wrap">
          {/* Header */}
          <div className="head">
            <div>
              <h1>Luyện nghe chép chính tả</h1>
              <p>Nghe audio tiếng Anh và gõ lại chính xác. Cải thiện kỹ năng nghe mỗi ngày.</p>
            </div>
            <div className="acts">
              <button
                type="button"
                className="b2"
                onClick={() => {
                  setNewError("");
                  setIsNewOpen(true);
                }}
              >
                + Tạo bài từ văn bản
              </button>
              <button
                type="button"
                className="b2"
                onClick={() => setIsNotesOpen(true)}
              >
                Sổ từ nghe sai <b>{Object.keys(notes).length}</b>
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="strip">
            <div>
              <small>Câu đã luyện</small>
              <b>{stats.n}</b>
            </div>
            <div>
              <small>Độ chính xác trung bình</small>
              <b>{avgAccuracy}</b>
            </div>
            <div>
              <small>Bài đã hoàn thành</small>
              <b>
                {completedLessonsCount}/{allLessons.length}
              </b>
            </div>
          </div>

          {/* Filters row */}
          <div className="fl">
            <label className="search">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#98A0CF" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                placeholder="Tìm bài..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Tìm bài"
              />
            </label>

            {/* Level segmented control */}
            <div className="seg" role="group" aria-label="Lọc theo độ khó">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  aria-pressed={selectedLv === lvl}
                  onClick={() => setSelectedLv(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Category Chips */}
          <div className="chips" role="group" aria-label="Lọc theo chủ đề">
            {categoryList.map((cat) => (
              <button
                key={cat}
                type="button"
                className="chip"
                aria-pressed={selectedCat === cat}
                onClick={() => setSelectedCat(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Exercise Grid */}
          <div className="grid">
            {filteredLessons.length === 0 ? (
              <div className="empty">
                <h2>Không có bài nào</h2>
                <p>Thử đổi từ khoá hoặc bộ lọc, hoặc tạo bài từ văn bản của bạn.</p>
              </div>
            ) : (
              filteredLessons.map((lesson) => {
                const p = prog[lesson.id];
                const accentColor = LEVEL_COLORS[lesson.lv] || "#5EE0A0";
                return (
                  <article
                    key={lesson.id}
                    className="card"
                    style={{ "--a": accentColor } as React.CSSProperties}
                    tabIndex={0}
                    role="button"
                    aria-label={`Bài học: ${lesson.title}`}
                    onClick={() => startLesson(lesson)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") startLesson(lesson);
                    }}
                  >
                    {lesson.custom ? (
                      <button
                        type="button"
                        className="del"
                        aria-label={`Xoá bài ${lesson.title}`}
                        onClick={(e) => handleDeleteLesson(lesson.id, e)}
                      >
                        ✕
                      </button>
                    ) : null}

                    <div className="cat">
                      <span>{lesson.cat}</span>
                    </div>

                    <h3>{lesson.title}</h3>
                    <p>{lesson.desc}</p>

                    <div className="meta">
                      <span className="lv">{lesson.lv}</span>
                      <span>{lesson.s.length} câu</span>
                      <span>{lesson.dur}</span>
                    </div>

                    {p && p.best >= 0 ? (
                      <div className="best">
                        <div className="t">
                          <i style={{ width: `${p.best}%` }} />
                        </div>
                        <span>
                          Điểm cao nhất <b>{p.best}%</b>
                        </span>
                      </div>
                    ) : (
                      <div className="best">
                        <span>Chưa làm bài này</span>
                      </div>
                    )}

                    <div className="cta">{p ? "Luyện lại" : "Bắt đầu"}</div>
                  </article>
                );
              })
            )}
          </div>
        </main>
      ) : null}

      {/* VIEW 2: PLAYER */}
      {view === "play" && activeLesson ? (
        <main className="wrap">
          <div className="pl">
            {/* Player Topbar */}
            <div className="pl-top">
              <button
                type="button"
                className="back"
                onClick={() => {
                  if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                  }
                  if (results.length > 0 && !confirm("Thoát bài giữa chừng? Kết quả sẽ không được lưu.")) {
                    return;
                  }
                  setView("lib");
                }}
              >
                &larr; Thư viện
              </button>
              <h2>{activeLesson.title}</h2>
              <div className="seg" role="group" aria-label="Chế độ luyện">
                <button
                  type="button"
                  aria-pressed={mode === "full"}
                  onClick={() => {
                    setMode("full");
                    setPlayerStatus("ask");
                    setHintN(0);
                  }}
                >
                  Chép cả câu
                </button>
                <button
                  type="button"
                  aria-pressed={mode === "cloze"}
                  onClick={() => {
                    setMode("cloze");
                    setPlayerStatus("ask");
                    setHintN(0);
                  }}
                >
                  Điền từ thiếu
                </button>
              </div>
            </div>

            {/* Progress Bar per sentence */}
            <div className="prog">
              {activeLesson.s.map((_, k) => {
                const r = results[k];
                const isNow = k === currentIdx && !r;
                const cls = r ? getAccClass(r.acc) : isNow ? "now" : "";
                return <i key={k} className={cls} />;
              })}
            </div>

            {/* Meta row */}
            <div className="pmeta">
              <span>
                Câu {currentIdx + 1} / {activeLesson.s.length}
              </span>
              <span>{replays} lần nghe lại</span>
            </div>

            {/* Stage */}
            <div className="stage">
              {/* Listen control */}
              <div className="listen">
                <button
                  type="button"
                  className={`play ${isPlaying ? "on" : ""}`}
                  aria-label="Phát câu này"
                  onClick={() => say(activeLesson.s[currentIdx], speed)}
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <span className="bars" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                </button>

                <div className="lrow">
                  <button type="button" className="replay" onClick={handleReplay}>
                    Nghe lại <span className="kbd">Alt+R</span>
                  </button>
                  <span>Tốc độ</span>
                  <div className="sp" role="group" aria-label="Tốc độ đọc">
                    {[0.5, 0.75, 1, 1.25].map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={speed === r}
                        onClick={() => {
                          setSpeed(r);
                          say(activeLesson.s[currentIdx], r);
                        }}
                      >
                        {r}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Input Area or Checked Diff */}
              {playerStatus === "ask" ? (
                <div>
                  {mode === "full" ? (
                    <input
                      ref={inputRef}
                      className="ans"
                      type="text"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      placeholder="Gõ lại những gì bạn nghe được..."
                      aria-label="Câu trả lời"
                      value={fullInput}
                      onChange={(e) => setFullInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCheck();
                        }
                      }}
                    />
                  ) : (
                    <div className="cloze">
                      {splitWords(activeLesson.s[currentIdx]).map((w, k) => {
                        const blanks = makeBlanks(activeLesson.s[currentIdx]);
                        if (!blanks.includes(k)) {
                          return <span key={k}>{w} </span>;
                        }
                        const m = w.match(/^([^A-Za-z0-9']*)(.*?)([^A-Za-z0-9']*)$/);
                        const prefix = m ? m[1] : "";
                        const core = m ? m[2] : w;
                        const suffix = m ? m[3] : "";
                        return (
                          <span key={k}>
                            {prefix}
                            <input
                              type="text"
                              size={Math.max(3, core.length + 1)}
                              autoComplete="off"
                              autoCapitalize="off"
                              spellCheck="false"
                              aria-label={`Từ thứ ${k + 1}`}
                              value={clozeInputs[k] || ""}
                              onChange={(e) =>
                                setClozeInputs((prev) => ({
                                  ...prev,
                                  [k]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleCheck();
                                }
                              }}
                            />
                            {suffix}{" "}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Hintline */}
                  <div className="hintline">
                    {hintN > 0 ? (
                      <>
                        {splitWords(activeLesson.s[currentIdx]).slice(0, hintN).join(" ")}
                        {hintN < splitWords(activeLesson.s[currentIdx]).length ? <s> …</s> : null}
                      </>
                    ) : null}
                  </div>

                  {/* Action buttons */}
                  <div className="row">
                    <button type="button" className="btn ghost" onClick={handleHint}>
                      Gợi ý <span className="kbd">Alt+H</span>
                    </button>
                    <button type="button" className="btn ghost" onClick={handleReveal}>
                      Xem đáp án
                    </button>
                    <span className="sp2" />
                    <button type="button" className="btn" onClick={handleCheck}>
                      Kiểm tra <span className="kbd">Enter</span>
                    </button>
                  </div>
                </div>
              ) : currentResult ? (
                <div className="res" aria-live="polite">
                  <div className="score">
                    <b>{currentResult.revealed ? "–" : `${currentResult.acc}%`}</b>
                    <span>
                      {currentResult.revealed
                        ? "Bạn đã xem đáp án, câu này tính 0%"
                        : currentResult.acc >= 90
                        ? "Chính xác!"
                        : currentResult.acc >= 60
                        ? "Gần đúng, xem lại các từ đánh dấu bên dưới"
                        : "Nghe lại và thử thêm lần nữa"}
                    </span>
                  </div>

                  <div
                    className="diff"
                    dangerouslySetInnerHTML={{ __html: currentResult.html }}
                  />

                  <div className="leg">
                    <span>
                      <i style={{ color: "var(--ok)" }}>xanh</i> đúng
                    </span>
                    <span>
                      <i style={{ background: "rgba(246,232,92,.18)", color: "var(--mark)" }}>
                        vàng
                      </i>{" "}
                      thiếu / sai
                    </span>
                    <span>
                      <i style={{ color: "var(--bad)", textDecoration: "line-through" }}>
                        đỏ gạch
                      </i>{" "}
                      thừa
                    </span>
                  </div>

                  <div className="row">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => say(activeLesson.s[currentIdx], speed)}
                    >
                      Nghe lại
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        setPlayerStatus("ask");
                        setHintN(0);
                      }}
                    >
                      Làm lại câu
                    </button>
                    <span className="sp2" />
                    <button
                      type="button"
                      id="bNext"
                      className="btn mk"
                      onClick={handleNext}
                    >
                      {currentIdx === activeLesson.s.length - 1 ? "Xem kết quả" : "Câu tiếp"}
                      <span className="kbd" style={{ borderColor: "rgba(0,0,0,.3)", color: "var(--ink)" }}>
                        Enter
                      </span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      ) : null}

      {/* VIEW 3: RESULT */}
      {view === "result" && activeLesson ? (
        <main className="wrap">
          {(() => {
            const sum = results.reduce((acc, r) => acc + r.acc, 0);
            const avg = Math.round(sum / results.length) || 0;
            const missedMap: Record<string, number> = {};
            results.forEach((r) =>
              r.missed.forEach((w) => {
                missedMap[w] = (missedMap[w] || 0) + 1;
              })
            );
            const missedWords = Object.keys(missedMap);
            const mm = Math.floor(elapsedSecs / 60);
            const ss = String(elapsedSecs % 60).padStart(2, "0");

            return (
              <div className="pl res">
                <div className="pl-top">
                  <button type="button" className="back" onClick={() => setView("lib")}>
                    &larr; Thư viện
                  </button>
                  <h2>{activeLesson.title}</h2>
                </div>

                <div className="big">
                  <b>{avg}%</b>
                  <p>
                    {avg >= 90
                      ? "Rất tốt, tai bạn bắt chuẩn gần hết các chi tiết."
                      : avg >= 70
                      ? "Khá ổn. Xem lại các câu và từ đánh dấu dưới đây."
                      : "Cần luyện thêm. Hãy thử nghe chậm ở tốc độ 0.75x."}
                  </p>
                </div>

                <div className="kp">
                  <div>
                    <small>Thời gian</small>
                    <b>
                      {mm}:{ss}
                    </b>
                  </div>
                  <div>
                    <small>Lần nghe lại</small>
                    <b>{replays}</b>
                  </div>
                  <div>
                    <small>Lần dùng gợi ý</small>
                    <b>{hints}</b>
                  </div>
                </div>

                <h2>Từng câu</h2>
                <div className="sl">
                  {activeLesson.s.map((s, k) => (
                    <div key={k}>
                      <b className={getAccClass(results[k]?.acc ?? 0)}>
                        {results[k]?.acc ?? 0}%
                      </b>
                      <span>{s}</span>
                    </div>
                  ))}
                </div>

                {missedWords.length > 0 ? (
                  <>
                    <h2>Từ bạn nghe sai</h2>
                    <div className="mw">
                      {missedWords.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => say(w, 0.8)}
                          title="Nghe từ này"
                        >
                          ♪ {w}
                          {missedMap[w] > 1 ? <span>&times;{missedMap[w]}</span> : null}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => {
                        const updatedNotes = { ...notes };
                        missedWords.forEach((w) => {
                          updatedNotes[w] = (updatedNotes[w] || 0) + missedMap[w];
                        });
                        saveNotes(updatedNotes);
                        alert(`Đã lưu ${missedWords.length} từ vào Sổ từ nghe sai!`);
                      }}
                    >
                      Lưu {missedWords.length} từ vào sổ tay
                    </button>
                  </>
                ) : (
                  <p style={{ color: "var(--ok)", fontWeight: 600 }}>
                    Không có từ nào bị sai. Chuyển sang bài khó hơn nhé!
                  </p>
                )}

                <div className="row" style={{ marginTop: "28px" }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => startLesson(activeLesson)}
                  >
                    Làm lại bài
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setView("lib")}
                  >
                    Về thư viện
                  </button>
                </div>
              </div>
            );
          })()}
        </main>
      ) : null}

      {/* MODAL 1: TẠO BÀI TỪ VĂN BẢN */}
      {isNewOpen ? (
        <dialog open aria-modal="true" role="dialog" aria-labelledby="dialog-create-title">
          <h2 id="dialog-create-title">Tạo bài từ văn bản của bạn</h2>
          <p className="s">
            Dán một đoạn tiếng Anh. Hệ thống sẽ tự động tách thành từng câu để bạn luyện nghe chép.
          </p>
          <input
            placeholder="Tên bài (không bắt buộc)"
            maxLength={60}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <textarea
            placeholder="Dán đoạn văn tiếng Anh ở đây..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
          />
          {newError ? <div className="err">{newError}</div> : null}
          <div className="drow">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setIsNewOpen(false)}
            >
              Huỷ
            </button>
            <button type="button" className="btn" onClick={handleCreateLesson}>
              Tạo bài
            </button>
          </div>
        </dialog>
      ) : null}

      {/* MODAL 2: SỔ TỪ NGHE SAI */}
      {isNotesOpen ? (
        <dialog open aria-modal="true" role="dialog" aria-labelledby="dialog-notes-title">
          <h2 id="dialog-notes-title">Sổ từ nghe sai</h2>
          <p className="s">Những từ bạn hay gõ sai. Bấm loa để nghe lại.</p>
          <div className="wl">
            {Object.keys(notes).length === 0 ? (
              <p style={{ color: "var(--mute)" }}>
                Chưa có từ nào. Sau mỗi bài, bạn có thể lưu những từ nghe sai vào đây.
              </p>
            ) : (
              Object.keys(notes)
                .sort((a, b) => notes[b] - notes[a])
                .map((word) => (
                  <div key={word}>
                    <strong>{word}</strong>
                    <small>sai {notes[word]} lần</small>
                    <button
                      type="button"
                      aria-label={`Nghe ${word}`}
                      onClick={() => say(word, 0.8)}
                    >
                      ♪
                    </button>
                    <button
                      type="button"
                      aria-label={`Xoá ${word}`}
                      onClick={() => {
                        const updated = { ...notes };
                        delete updated[word];
                        saveNotes(updated);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))
            )}
          </div>
          <div className="drow">
            <button
              type="button"
              className="btn ghost"
              onClick={() => setIsNotesOpen(false)}
            >
              Đóng
            </button>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
