"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileEdit,
  Headphones,
  Lightbulb,
  Mic,
  PenLine,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Target,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";

const ERROR_TYPES = [
  { label: "Misheard Word", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { label: "Grammar Rule", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { label: "Careless Trap", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { label: "Vocabulary Gap", color: "bg-blue-100 text-blue-700 border-blue-200" },
];

const WEAK_SPOTS = [
  { topic: "Relative Clauses", rate: 45, color: "bg-rose-500" },
  { topic: "Listening Section 3", rate: 30, color: "bg-orange-400" },
  { topic: "Modals of Deduction", rate: 25, color: "bg-blue-500" },
];

const MOCK_ENTRIES = [
  {
    id: 1,
    skill: "Reading",
    skillIcon: BookOpen,
    skillColor: "bg-indigo-50 text-indigo-700 border-indigo-100",
    source: "Cool Roofs Neighbourhood Pilot",
    savedOn: "Oct 24, 2026",
    failCount: 3,
    failLabel: "Failed 3 times",
    failColor: "bg-rose-50 text-rose-600 border-rose-100",
    question:
      "Reflective coatings on rooftops have an impact on the demand for energy from the grid.",
    yourAnswer: "Reflective coatings increase overall grid power dependency.",
    correctAnswer:
      "Reflective coatings lower internal building temperatures and reduce AC loads.",
    errorType: "Careless Trap",
    aiBreakdown:
      "You confused cause-and-effect in paragraph 3. The passage explicitly highlights that cool roofs deflect solar radiation, thereby decreasing energy consumption rather than raising grid load.",
    status: "Needs Practice",
    statusColor: "text-rose-600",
    note: "",
    bookmarked: false,
  },
  {
    id: 2,
    skill: "Listening",
    skillIcon: Headphones,
    skillColor: "bg-amber-50 text-amber-700 border-amber-100",
    source: "Lecture on Subglacial Volcanism",
    savedOn: "Oct 22, 2026",
    failCount: 2,
    failLabel: "Failed 2 times",
    failColor: "bg-orange-50 text-orange-600 border-orange-100",
    question:
      "What happens to meltwater activity underneath glaciers during winter?",
    yourAnswer: "Glacial melting completely stops during winter seasons.",
    correctAnswer:
      "Subglacial geothermal heat keeps meltwater active underneath year-round.",
    errorType: "Misheard Word",
    aiBreakdown:
      "Misheard detail in speaker track #2. The professor emphasized that geothermal vents provide continuous basal melting despite freezing surface temperatures.",
    status: "Reviewing",
    statusColor: "text-blue-600",
    note: "",
    bookmarked: true,
  },
  {
    id: 3,
    skill: "Writing",
    skillIcon: PenLine,
    skillColor: "bg-emerald-50 text-emerald-700 border-emerald-100",
    source: "IELTS Writing Task 2 – Technology",
    savedOn: "Oct 20, 2026",
    failCount: 1,
    failLabel: "Failed 1 time",
    failColor: "bg-slate-100 text-slate-600 border-slate-200",
    question: "Task 2: Discuss the impact of social media on modern society.",
    yourAnswer: "Social media has positive effects on human communications.",
    correctAnswer:
      "A high-band answer requires nuanced analysis of both benefits and drawbacks with specific examples and cohesive argumentation.",
    errorType: "Grammar Rule",
    aiBreakdown:
      "Your response lacked coherence signals (firstly, furthermore, in conclusion) and the thesis statement was too general. Band 5.5 – target is Band 7.0.",
    status: "Mastered",
    statusColor: "text-emerald-600",
    note: "Need to use more linking words and give specific examples.",
    bookmarked: false,
  },
];

const skillIconMap: Record<string, React.ElementType> = {
  Reading: BookOpen,
  Listening: Headphones,
  Writing: PenLine,
  Speaking: Mic,
};

export default function MistakesNotebookPage() {
  const [expandedIds, setExpandedIds] = useState<number[]>([1, 2]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [bookmarks, setBookmarks] = useState<Record<number, boolean>>(
    Object.fromEntries(MOCK_ENTRIES.map((e) => [e.id, e.bookmarked])),
  );

  const toggleExpand = (id: number) =>
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const filteredEntries = MOCK_ENTRIES.filter((e) => {
    if (activeFilter && e.errorType !== activeFilter) return false;
    if (statusFilter !== "All Statuses" && e.status !== statusFilter)
      return false;
    return true;
  });

  return (
    <div className="mx-auto min-h-[100dvh] max-w-7xl bg-[#fbf9ff] pb-24 lg:min-h-0">
      {/* Mobile Header */}
      <header className="flex min-h-16 items-center gap-2 border-b border-[#e7e1ef] bg-white px-3 mb-6 lg:hidden">
        <Link
          href="/learn"
          aria-label="Back to learn"
          className="grid size-11 place-items-center rounded-full text-[#3e29c2]"
        >
          <ArrowLeft size={19} />
        </Link>
        <div>
          <p className="text-sm font-bold text-[#331fb7]">Indigo Scholar</p>
          <p className="text-xs text-[#777080]">Review and master difficult concepts</p>
        </div>
      </header>

      <div className="space-y-8 font-sans pb-16 px-4 lg:px-0">
        {/* ── Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">
              My Mistakes Notebook
            </h1>
            <p className="text-base font-medium text-slate-500 mt-1">
              Review and master the concepts you&apos;ve struggled with.
            </p>
          </div>

          {/* Quick Action Widget */}
          <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm shrink-0">
            <div className="text-center">
              <p className="text-3xl font-black text-indigo-600 leading-none">
                14
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                Mistakes Saved
              </p>
              <p className="text-xs font-bold text-slate-500">Ready to Review</p>
            </div>
            <Button className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm shadow-md flex items-center gap-2">
              Practice Mistakes Now
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          {/* ── Left: Filters + Cards ── */}
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Error Types:
                </span>
                {ERROR_TYPES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() =>
                      setActiveFilter(activeFilter === t.label ? null : t.label)
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition-all ${
                      activeFilter === t.label
                        ? t.color + " ring-2 ring-offset-1 ring-indigo-400"
                        : t.color
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Status:
                </span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option>All Statuses</option>
                  <option>Needs Practice</option>
                  <option>Reviewing</option>
                  <option>Mastered</option>
                </select>
              </div>
            </div>

            {/* Entry Cards */}
            <div className="space-y-5">
              {filteredEntries.map((entry, index) => {
                const isExpanded = expandedIds.includes(entry.id);
                const SkillIcon = skillIconMap[entry.skill] ?? BookOpen;

                return (
                  <div
                    key={entry.id}
                    className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className="size-8 shrink-0 rounded-full bg-indigo-50 text-indigo-600 font-black text-sm flex items-center justify-center border border-indigo-100">
                          {index + 1}
                        </span>
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold shrink-0 ${entry.skillColor}`}
                          >
                            <SkillIcon size={13} /> {entry.skill}
                          </span>
                          <span className="font-bold text-slate-800 text-sm truncate">
                            {entry.source}
                          </span>
                        </div>
                        <p className="hidden sm:block text-xs text-slate-400 font-medium shrink-0">
                          Saved on {entry.savedOn}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span
                          className={`hidden sm:flex items-center gap-1 text-xs font-bold border rounded-full px-3 py-1 ${entry.failColor}`}
                        >
                          <AlertTriangle size={12} /> {entry.failLabel}
                        </span>
                        <button
                          onClick={() =>
                            setBookmarks((prev) => ({
                              ...prev,
                              [entry.id]: !prev[entry.id],
                            }))
                          }
                          className={`p-1.5 rounded-full transition-colors ${
                            bookmarks[entry.id]
                              ? "text-indigo-600"
                              : "text-slate-300 hover:text-slate-500"
                          }`}
                        >
                          <Bookmark
                            size={18}
                            fill={bookmarks[entry.id] ? "currentColor" : "none"}
                          />
                        </button>
                        <button
                          onClick={() => toggleExpand(entry.id)}
                          className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Card Body */}
                    {isExpanded && (
                      <div className="px-6 py-5 space-y-5">
                        {/* Your Answer vs Correct Answer */}
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-4">
                            <p className="text-[10px] font-black uppercase text-rose-600 tracking-widest flex items-center gap-1.5 mb-2">
                              <XCircle size={12} /> Your Answer
                            </p>
                            <p className="text-sm font-medium text-rose-800 leading-relaxed">
                              {entry.yourAnswer}
                            </p>
                          </div>
                          <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
                            <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest flex items-center gap-1.5 mb-2">
                              <CheckCircle2 size={12} /> Correct Answer
                            </p>
                            <p className="text-sm font-medium text-emerald-800 leading-relaxed">
                              {entry.correctAnswer}
                            </p>
                          </div>
                        </div>

                        {/* AI Expert Breakdown */}
                        <div className="bg-gradient-to-br from-indigo-50 via-indigo-50/50 to-purple-50 border border-indigo-100 rounded-2xl p-5">
                          <h4 className="flex items-center gap-2 font-black text-indigo-800 text-xs uppercase tracking-widest mb-3">
                            <Sparkles size={14} className="text-indigo-500" />
                            AI Expert Breakdown
                          </h4>
                          <p className="text-sm leading-relaxed text-slate-700">
                            {entry.aiBreakdown}
                          </p>
                        </div>

                        {/* Personal Note */}
                        <div className="relative">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                            Personal Note
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Add your own note..."
                            value={notes[entry.id] ?? entry.note}
                            onChange={(e) =>
                              setNotes((prev) => ({
                                ...prev,
                                [entry.id]: e.target.value,
                              }))
                            }
                            className="w-full resize-none rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 placeholder:text-amber-400/70 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                          />
                          <FileEdit
                            size={14}
                            className="absolute right-4 top-10 text-amber-400"
                          />
                        </div>

                        {/* Card Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                          <div className="flex gap-2">
                            <button className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 transition-colors">
                              <RotateCcw size={14} /> Re-try this question
                            </button>
                            <button className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 transition-colors">
                              <FileEdit size={14} /> Add personal note
                            </button>
                          </div>
                          <span className={`text-xs font-black ${entry.statusColor}`}>
                            Status: {entry.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredEntries.length === 0 && (
                <div className="text-center py-16 text-slate-400">
                  <Brain size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="font-bold text-lg">No mistakes found</p>
                  <p className="text-sm">Try adjusting your filters.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-5">
            {/* Top 3 Weak Spots */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="font-black text-slate-800 mb-1 flex items-center gap-2">
                <Target size={18} className="text-rose-500" /> Top 3 Weak Spots
              </h3>
              <p className="text-xs font-medium text-slate-400 mb-6">
                Areas requiring your immediate review priority.
              </p>
              <div className="space-y-5">
                {WEAK_SPOTS.map((spot) => (
                  <div key={spot.topic}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-bold text-slate-700">
                        {spot.topic}
                      </p>
                      <p
                        className={`text-xs font-black ${
                          spot.rate >= 40
                            ? "text-rose-600"
                            : spot.rate >= 25
                              ? "text-orange-500"
                              : "text-blue-600"
                        }`}
                      >
                        {spot.rate}% error rate
                      </p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${spot.color}`}
                        style={{ width: `${spot.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-6 w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 py-3 text-sm font-bold text-slate-700 transition-colors">
                <Zap size={16} className="text-indigo-500" /> Generate Custom Quiz
              </button>
            </div>

            {/* Smart Spaced Repetition */}
            <div className="bg-indigo-700 rounded-3xl p-6 shadow-lg shadow-indigo-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
              <div className="relative z-10">
                <div className="size-10 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
                  <Lightbulb size={20} className="text-amber-300" />
                </div>
                <h3 className="font-black text-white text-lg mb-2">
                  Smart Spaced Repetition
                </h3>
                <p className="text-sm font-medium leading-relaxed text-indigo-200">
                  Indigo Scholar automatically schedules reviews for items in your
                  mistakes notebook right before your memory retention begins to
                  fade.
                </p>
                <button className="mt-4 flex items-center gap-2 text-xs font-black text-indigo-200 hover:text-white transition-colors">
                  Learn how it works <ChevronDown size={14} />
                </button>
              </div>
            </div>

            {/* Study Stats */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Brain size={18} className="text-indigo-500" /> This Week
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <p className="text-2xl font-black text-indigo-600">6</p>
                  <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">
                    Reviewed
                  </p>
                </div>
                <div className="text-center bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <p className="text-2xl font-black text-emerald-600">4</p>
                  <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">
                    Mastered
                  </p>
                </div>
                <div className="text-center bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <p className="text-2xl font-black text-rose-500">3</p>
                  <p className="text-[9px] font-bold uppercase text-slate-400 mt-1">
                    Added
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
