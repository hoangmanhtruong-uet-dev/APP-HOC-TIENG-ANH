import { CheckCircle2, Headphones, BookOpen, PenLine, Mic, Clock3, Gauge, Target, Sparkles, ArrowRight, ChevronDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { MockSessionPageData } from "@/features/mock-tests/server/content";

export function MockTestSummary({ data }: { data: MockSessionPageData }) {
  const result = data.result;
  const readingRaw = rawScore(result?.reading_score, result?.reading_max_score);
  const listeningRaw = rawScore(result?.listening_score, result?.listening_max_score);

  return (
    <div className="space-y-8 font-sans pb-12 max-w-6xl mx-auto">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-black tracking-wider text-indigo-700 uppercase">
              OFFICIAL MOCK ASSESSMENT
            </span>
            <span className="text-sm font-medium text-slate-500 flex items-center gap-1.5">
              • Completed on Oct 24, 2023
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-800">
            {data.version.title || "Academic IELTS Mock Test #18"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="rounded-xl h-11 px-5 font-bold text-slate-700 hover:bg-slate-100 shadow-sm border border-slate-200">
            Share Report
          </Button>
          <Button className="rounded-xl h-11 px-5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            Download PDF
          </Button>
        </div>
      </header>

      {/* Top Stats Grid */}
      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Overall Band Card */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col justify-center">
          <p className="text-[11px] font-black uppercase text-slate-500 tracking-widest mb-4">Overall Estimated Band</p>
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-6xl font-black text-indigo-600 tracking-tighter">7.5</span>
            <span className="text-xl font-bold text-slate-400">/ 9.0</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-xs font-bold text-indigo-700 w-max mb-6">
            <CheckCircle2 size={14} /> Performance: Advanced C1
          </div>
          <p className="text-sm font-medium leading-relaxed text-slate-600">
            Exceeds university entry requirements for postgraduate studies. Strong analytical reading and auditory discrimination.
          </p>
        </div>

        {/* Section Scores Card */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm grid grid-cols-2 gap-x-8 gap-y-10">
           {/* Listening */}
           <div>
             <div className="flex items-center justify-between mb-2">
               <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Headphones size={16} className="text-indigo-500" /> Listening</span>
               <span className="text-[10px] font-black text-slate-400">{listeningRaw !== "Chưa có dữ liệu" ? listeningRaw : "37/40"}</span>
             </div>
             <div className="flex items-end gap-2 mb-2">
               <span className="text-2xl font-black text-slate-800">8.0</span>
               <span className="text-xs font-semibold text-slate-500 mb-1">Band</span>
             </div>
             <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-600 rounded-full" style={{width: '85%'}}></div></div>
           </div>
           
           {/* Reading */}
           <div>
             <div className="flex items-center justify-between mb-2">
               <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><BookOpen size={16} className="text-indigo-500" /> Reading</span>
               <span className="text-[10px] font-black text-slate-400">{readingRaw !== "Chưa có dữ liệu" ? readingRaw : "39/40"}</span>
             </div>
             <div className="flex items-end gap-2 mb-2">
               <span className="text-2xl font-black text-slate-800">8.5</span>
               <span className="text-xs font-semibold text-slate-500 mb-1">Band</span>
             </div>
             <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-600 rounded-full" style={{width: '95%'}}></div></div>
           </div>

           {/* Writing */}
           <div>
             <div className="flex items-center justify-between mb-2">
               <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><PenLine size={16} className="text-indigo-500" /> Writing</span>
               <span className="text-[10px] font-black text-slate-400">Task 1 & 2</span>
             </div>
             <div className="flex items-end gap-2 mb-2">
               <span className="text-2xl font-black text-slate-800">6.5</span>
               <span className="text-xs font-semibold text-slate-500 mb-1">Band</span>
             </div>
             <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-600 rounded-full" style={{width: '65%'}}></div></div>
           </div>

           {/* Speaking */}
           <div>
             <div className="flex items-center justify-between mb-2">
               <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5"><Mic size={16} className="text-indigo-500" /> Speaking</span>
               <span className="text-[10px] font-black text-slate-400">AI Evaluated</span>
             </div>
             <div className="flex items-end gap-2 mb-2">
               <span className="text-2xl font-black text-slate-800">7.0</span>
               <span className="text-xs font-semibold text-slate-500 mb-1">Band</span>
             </div>
             <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-600 rounded-full" style={{width: '75%'}}></div></div>
           </div>
        </div>

        {/* Time Stats Card */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex flex-col justify-center space-y-8">
           <div className="flex items-start gap-4">
             <div className="size-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
               <Clock3 size={18} className="text-indigo-500" />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Time Taken</p>
               <p className="text-xl font-black text-slate-800">2h 42m <span className="text-sm font-bold text-slate-400">/ 2h 45m</span></p>
             </div>
           </div>
           
           <div className="flex items-start gap-4">
             <div className="size-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
               <Gauge size={18} className="text-indigo-500" />
             </div>
             <div>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pacing Efficiency</p>
               <p className="text-xl font-black text-slate-800">Optimal <span className="text-sm font-bold text-slate-400">(98%)</span></p>
             </div>
           </div>
        </div>

      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        
        {/* Left Column Data */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center">
            <h3 className="text-sm font-black text-slate-800 text-left mb-6 flex items-center justify-between">
              Skill Competency Matrix <Target size={16} className="text-slate-400"/>
            </h3>
            {/* Mock Radar Chart Area */}
            <div className="relative w-full aspect-square max-w-[280px] mx-auto mb-6 flex items-center justify-center bg-slate-50/50 rounded-full border border-slate-100">
               <svg viewBox="0 0 100 100" className="w-full h-full p-4 overflow-visible">
                 <polygon points="50,10 90,35 75,85 25,85 10,35" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                 <polygon points="50,25 75,42 65,70 35,70 25,42" fill="none" stroke="#e2e8f0" strokeWidth="1" />
                 <polygon points="50,15 85,38 70,80 30,75 18,32" fill="rgba(79, 70, 229, 0.15)" stroke="#4f46e5" strokeWidth="2" strokeLinejoin="round" />
                 <circle cx="50" cy="15" r="2.5" fill="#4f46e5" />
                 <circle cx="85" cy="38" r="2.5" fill="#4f46e5" />
                 <circle cx="70" cy="80" r="2.5" fill="#4f46e5" />
                 <circle cx="30" cy="75" r="2.5" fill="#4f46e5" />
                 <circle cx="18" cy="32" r="2.5" fill="#4f46e5" />
               </svg>
               <span className="absolute top-0 text-[10px] font-bold text-slate-600">Listening (8.0)</span>
               <span className="absolute right-0 top-1/3 text-[10px] font-bold text-slate-600">Reading (8.5)</span>
               <span className="absolute bottom-4 right-10 text-[10px] font-bold text-slate-600">Writing (6.5)</span>
               <span className="absolute bottom-4 left-10 text-[10px] font-bold text-slate-600">Speaking (7.0)</span>
               <span className="absolute left-0 top-1/3 text-[10px] font-bold text-slate-600">Grammar (7.5)</span>
            </div>
            <p className="text-xs font-medium leading-relaxed text-slate-500">
              Your profile is heavily weighted towards receptive skills (Reading/Listening). Productive skills (Writing) require targeted intervention.
            </p>
          </div>

          <div className="bg-indigo-50/50 rounded-3xl border border-indigo-100 p-8 shadow-sm">
            <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
              <div className="bg-indigo-600 text-white rounded-lg p-1.5"><Sparkles size={16}/></div> AI Recommended Action Plan
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest ml-auto">Customized for target Band 8.0+</span>
            </h3>
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm flex gap-4">
                <span className="size-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">1</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Writing Task 2 Cohesion Drill</h4>
                  <p className="text-xs leading-relaxed text-slate-500 mb-3">Focus on transitional phrases and lexical resource variety to push Task 2 from 6.5 to 7.5.</p>
                  <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">Start targeted module <ArrowRight size={12}/></button>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm flex gap-4">
                <span className="size-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">2</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Speaking Part 3 Synonyms</h4>
                  <p className="text-xs leading-relaxed text-slate-500 mb-3">Work on paraphrasing abstract concepts instantly without hesitation fillers.</p>
                  <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">Launch voice practice <ArrowRight size={12}/></button>
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-indigo-50 shadow-sm flex gap-4">
                <span className="size-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">3</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 mb-1">Listening Section 4 Map/Diagrams</h4>
                  <p className="text-xs leading-relaxed text-slate-500 mb-3">Review spatial vocabulary to ensure 100% accuracy in multi-speaker academic lectures.</p>
                  <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">Practice drills <ArrowRight size={12}/></button>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column Data */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
             <div className="flex items-start justify-between mb-8">
               <div>
                 <h3 className="text-base font-black text-slate-800 mb-1">Receptive Question Breakdown</h3>
                 <p className="text-xs font-medium text-slate-500">Reviewing errors in Listening and Reading sections</p>
               </div>
               <div className="flex gap-2">
                 <div className="bg-rose-50 text-rose-700 border border-rose-100 rounded-lg px-3 py-1 text-center">
                   <p className="text-lg font-black leading-none">3</p>
                   <p className="text-[10px] font-bold uppercase tracking-wider">Incorrect</p>
                 </div>
                 <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg px-3 py-1 text-center">
                   <p className="text-lg font-black leading-none">76</p>
                   <p className="text-[10px] font-bold uppercase tracking-wider">Correct</p>
                 </div>
               </div>
             </div>

             <div className="space-y-4">
               {/* Incorrect Item 1 */}
               <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                 <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-slate-700">Listening Q14</span>
                     <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">Incorrect</span>
                   </div>
                   <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700">Explain Answer <ChevronDown size={14}/></button>
                 </div>
                 <p className="text-sm font-medium text-slate-600 mb-4 border-l-2 border-slate-200 pl-3">
                   Speaker mentions the annual conference takes place in which month?
                 </p>
                 <div className="flex items-center gap-6 text-sm font-bold">
                   <span className="text-rose-600 line-through decoration-rose-300">Your answer: February</span>
                   <span className="text-indigo-600">Correct answer: November</span>
                 </div>
               </div>

               {/* Incorrect Item 2 */}
               <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                 <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-slate-700">Reading Q22</span>
                     <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">Incorrect</span>
                   </div>
                   <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700">Explain Answer <ChevronDown size={14}/></button>
                 </div>
                 <p className="text-sm font-medium text-slate-600 mb-4 border-l-2 border-slate-200 pl-3">
                   True/False/Not Given: The author claims fossil fuel subsidies decreased in 1998.
                 </p>
                 <div className="flex items-center gap-6 text-sm font-bold">
                   <span className="text-rose-600 line-through decoration-rose-300">Your answer: True</span>
                   <span className="text-indigo-600">Correct answer: Not Given</span>
                 </div>
               </div>

               {/* Incorrect Item 3 */}
               <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                 <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                     <span className="text-sm font-bold text-slate-700">Reading Q38</span>
                     <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">Incorrect</span>
                   </div>
                   <button className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:text-indigo-700">Explain Answer <ChevronDown size={14}/></button>
                 </div>
                 <p className="text-sm font-medium text-slate-600 mb-4 border-l-2 border-slate-200 pl-3">
                   Choose the correct heading for Paragraph E: &apos;The Paradox of Choice in Urban Planning&apos;
                 </p>
                 <div className="flex items-center gap-6 text-sm font-bold">
                   <span className="text-rose-600 line-through decoration-rose-300">Your answer: Section heading IV</span>
                   <span className="text-indigo-600">Correct answer: Section heading VII</span>
                 </div>
               </div>
             </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
             <div className="flex items-start justify-between mb-8">
               <div>
                 <h3 className="text-base font-black text-slate-800 mb-1">Writing & Speaking AI Evaluation</h3>
                 <p className="text-xs font-medium text-slate-500">Detailed criteria scoring and professional high-band rewrites</p>
               </div>
               <div className="bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full px-4 py-1 text-sm font-black text-center">
                 Band 6.5 Writing
               </div>
             </div>

             <div className="grid grid-cols-4 gap-4 mb-8">
               <div className="text-center bg-slate-50 border border-slate-100 rounded-xl p-3">
                 <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 h-6 flex items-center justify-center">Task Achievement</p>
                 <p className="text-lg font-black text-slate-800">7.0</p>
               </div>
               <div className="text-center bg-slate-50 border border-slate-100 rounded-xl p-3">
                 <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 h-6 flex items-center justify-center">Coherence & Cohesion</p>
                 <p className="text-lg font-black text-slate-800">6.0</p>
               </div>
               <div className="text-center bg-slate-50 border border-slate-100 rounded-xl p-3">
                 <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 h-6 flex items-center justify-center">Lexical Resource</p>
                 <p className="text-lg font-black text-slate-800">6.5</p>
               </div>
               <div className="text-center bg-slate-50 border border-slate-100 rounded-xl p-3">
                 <p className="text-[9px] font-bold uppercase text-slate-400 mb-1 h-6 flex items-center justify-center">Grammar Range</p>
                 <p className="text-lg font-black text-slate-800">6.5</p>
               </div>
             </div>

             <h4 className="text-sm font-bold text-slate-700 mb-4">AI High-Band Rewrite Sample (Task 2 Introduction)</h4>
             <div className="space-y-4">
               <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5">
                 <p className="text-[10px] font-black uppercase text-rose-600 tracking-wider flex items-center gap-1.5 mb-2"><X size={12}/> Your Original Sentence:</p>
                 <p className="text-[15px] font-serif italic text-rose-800">
                   &quot;Many people think that computers are making people lazier and this is a big problem in modern society.&quot;
                 </p>
               </div>
               <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
                 <p className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1.5 mb-2"><CheckCircle2 size={12}/> Band 8.5 Rewrite Suggestion:</p>
                 <p className="text-[15px] font-serif font-bold text-emerald-900">
                   &quot;A prevalent school of thought posits that technological automation engenders sedentary habits among citizens, presenting a multifaceted challenge to contemporary societal structures.&quot;
                 </p>
               </div>
             </div>
          </div>

        </div>

      </div>
      
      {/* Footer Action Bar */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex items-center justify-between mt-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-full bg-white text-indigo-500 flex items-center justify-center shadow-sm">
             <Target size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800">Ready to master your weak points?</h3>
            <p className="text-xs font-medium text-slate-500">Review solutions step-by-step or retake this test under timed conditions.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="rounded-xl font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 h-11 px-6 shadow-sm">
            Retake Test
          </Button>
          <Button className="rounded-xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white h-11 px-6 shadow-sm">
            Review Solution
          </Button>
        </div>
      </div>

    </div>
  );
}

function rawScore(
  score: number | null | undefined,
  max: number | null | undefined,
) {
  return score === null ||
    score === undefined ||
    max === null ||
    max === undefined
    ? "Chưa có dữ liệu"
    : `${score}/${max}`;
}
