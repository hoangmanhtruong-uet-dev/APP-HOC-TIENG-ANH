import { Mic2, ShieldCheck } from "lucide-react";

import { startSpeakingAction } from "@/features/speaking/actions";
import type { SpeakingPracticeData } from "@/features/speaking/server/content";

export function SpeakingStart({
  data,
  error,
}: {
  data: SpeakingPracticeData;
  error?: string;
}) {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pt-10 font-sans">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 md:p-12 shadow-sm">
        <div className="absolute right-0 top-0 opacity-5 pointer-events-none transform translate-x-1/4 -translate-y-1/4">
           <Mic2 size={300} />
        </div>
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 mb-6 shadow-sm">
            <Mic2 aria-hidden="true" size={32} />
          </div>
          <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-4">
            Practice Scenario
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 text-pretty">
            {data.set.title}
          </h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            {data.set.description}
          </p>
          
          <div className="mt-8 w-full rounded-2xl bg-slate-50 p-6 text-sm leading-6 border border-slate-100 text-left">
            <h3 className="font-bold text-slate-700 mb-2">Instructions</h3>
            <p className="text-slate-600">{data.set.instructions}</p>
          </div>
          
          <ul className="mt-6 flex flex-wrap justify-center gap-4 text-sm font-semibold">
            <li className="bg-sky-50 text-sky-700 px-4 py-2 rounded-xl border border-sky-100">{data.prompts.length} Prompts</li>
            <li className="bg-sky-50 text-sky-700 px-4 py-2 rounded-xl border border-sky-100">~{data.set.estimatedMinutes} mins</li>
            <li className="bg-sky-50 text-sky-700 px-4 py-2 rounded-xl border border-sky-100">AI Evaluated</li>
          </ul>
          
          {error ? (
            <p role="alert" className="mt-6 w-full rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">
              Không thể bắt đầu bài. Hãy thử lại.
            </p>
          ) : null}
          
          <form action={startSpeakingAction} className="mt-8 w-full max-w-sm">
            <input type="hidden" name="setSlug" value={data.set.slug} />
            <button className="w-full flex items-center justify-center gap-2 min-h-14 rounded-2xl bg-sky-600 text-lg font-black text-white hover:bg-sky-700 hover:scale-[1.02] transition-all shadow-md">
              <Mic2 size={20} /> Enter Practice Room
            </button>
          </form>
        </div>
      </section>
      
      <aside className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm text-sm leading-6 text-slate-500">
        <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
          <ShieldCheck aria-hidden="true" size={20} />
        </div>
        <p className="pt-1">
          <strong className="text-slate-700">Privacy First:</strong> Trình duyệt chỉ upload vào đường dẫn một lần do PostgreSQL cấp. Server xác minh file trước khi gắn vào attempt; transcript và AI feedback chỉ được tạo khi bạn đồng ý nộp bài.
        </p>
      </aside>
    </div>
  );
}
