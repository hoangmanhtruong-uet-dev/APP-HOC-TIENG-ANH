import React from "react";
import { 
  Trophy, 
  Clock, 
  Zap, 
  ShieldCheck, 
  Flame, 
  ArrowUpCircle,
  Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StreakFreezeButton } from "@/features/gamification/components/streak-freeze-button";

export default async function LeaderboardPage() {
  const supabase = await createSupabaseServerClient();
  
  // Fetch real users sorted by total_xp
  const { data: usersData } = await supabase
    .from("user_gamification")
    .select("user_id, total_xp, current_streak, profiles(display_name, avatar_url)")
    .order("total_xp", { ascending: false })
    .limit(30);

  const { data: { user } } = await supabase.auth.getUser();

  const { data: currentUserGamification } = await supabase
    .from("user_gamification")
    .select("streak_freezes_available, total_xp")
    .eq("user_id", user?.id)
    .single();

  const users = usersData || [];
  const top3 = users.slice(0, 3);
  const others = users.slice(3);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-slate-800 tracking-tight">
            <Trophy size={28} className="text-indigo-600" />
            Đấu Trường Tri Thức
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-500">
            Giải đấu hiện tại: <span className="text-cyan-500 uppercase tracking-wider">Kim Cương 💎</span>
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200">
          <Clock size={16} />
          Kết thúc sau: <span className="text-slate-800">2 ngày 14 giờ</span>
        </div>
      </div>

      {/* Podium View */}
      <div className="flex flex-col sm:flex-row items-end justify-center gap-2 sm:gap-6 mt-12 mb-8 h-64 px-4">
        {/* 2nd Place */}
        {top3[1] && (
        <div className="flex flex-col items-center flex-1 sm:w-32 z-10">
          <div className="relative mb-3">
            <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-slate-300 shadow-lg">
              <img src={(top3[1].profiles as any)?.avatar_url || "https://i.pravatar.cc/150"} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-black text-slate-600 border-2 border-white shadow-sm">2</div>
          </div>
          <div className="w-full flex-1 rounded-t-xl bg-gradient-to-t from-slate-200 to-slate-100 flex flex-col items-center pt-4 px-2 shadow-inner h-28 border border-slate-200 border-b-0">
            <span className="font-bold text-slate-800 text-sm truncate w-full text-center">{(top3[1].profiles as any)?.display_name || "Học viên"}</span>
            <span className="text-xs font-bold text-slate-500 mt-1">{top3[1].total_xp} XP</span>
          </div>
        </div>
        )}

        {/* 1st Place */}
        {top3[0] && (
        <div className="flex flex-col items-center flex-1 sm:w-32 z-20">
          <Crown size={32} className="text-yellow-400 fill-yellow-400 mb-2 drop-shadow-md animate-bounce" />
          <div className="relative mb-3">
            <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]">
              <img src={(top3[0].profiles as any)?.avatar_url || "https://i.pravatar.cc/150"} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-3 py-0.5 text-xs font-black text-yellow-900 border-2 border-white shadow-sm">1</div>
          </div>
          <div className="w-full flex-1 rounded-t-xl bg-gradient-to-t from-yellow-300 to-yellow-100 flex flex-col items-center pt-4 px-2 shadow-lg h-36 border border-yellow-200 border-b-0">
            <span className="font-bold text-slate-800 text-sm truncate w-full text-center">{(top3[0].profiles as any)?.display_name || "Học viên"}</span>
            <span className="text-xs font-black text-yellow-700 mt-1">{top3[0].total_xp} XP</span>
          </div>
        </div>
        )}

        {/* 3rd Place */}
        {top3[2] && (
        <div className="flex flex-col items-center flex-1 sm:w-32 z-10">
          <div className="relative mb-3">
            <div className="h-16 w-16 overflow-hidden rounded-full border-4 border-amber-700/50 shadow-lg">
              <img src={(top3[2].profiles as any)?.avatar_url || "https://i.pravatar.cc/150"} alt="Avatar" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-amber-600 px-2.5 py-0.5 text-xs font-black text-amber-50 border-2 border-white shadow-sm">3</div>
          </div>
          <div className="w-full flex-1 rounded-t-xl bg-gradient-to-t from-amber-200/60 to-amber-100/50 flex flex-col items-center pt-4 px-2 shadow-inner h-24 border border-amber-200/50 border-b-0">
            <span className="font-bold text-slate-800 text-sm truncate w-full text-center">{(top3[2].profiles as any)?.display_name || "Học viên"}</span>
            <span className="text-xs font-bold text-amber-800 mt-1">{top3[2].total_xp} XP</span>
          </div>
        </div>
        )}
      </div>

      {/* Speed Arena CTA */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-1 shadow-lg">
        <div className="absolute -right-10 -top-10 opacity-20">
          <Zap size={150} className="text-white" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-white/10 px-6 py-4 backdrop-blur-sm">
          <div className="text-white">
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Zap className="fill-yellow-400 text-yellow-400" />
              Đấu Trường Chớp Nhoáng (Speed Arena)
            </h3>
            <p className="mt-1 text-sm text-indigo-100">Trả lời 10 câu trong 60s để nhận nhân đôi điểm kinh nghiệm!</p>
          </div>
          <Button className="shrink-0 bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-md font-bold uppercase tracking-wider">
            Vào đấu trường ⚡
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <StreakFreezeButton 
          currentFreezes={currentUserGamification?.streak_freezes_available || 0} 
          currentXp={currentUserGamification?.total_xp || 0}
        />
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        
        {/* Promotion Zone */}
        <div className="bg-emerald-50/50 border-b-2 border-emerald-400/50 relative">
          <div className="absolute top-0 right-0 p-2 opacity-10">
            <ArrowUpCircle size={100} className="text-emerald-500" />
          </div>
          <div className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-emerald-600">
            Khu vực thăng hạng (Top 10 lên Cao Thủ 🏆)
          </div>
          
          <div className="divide-y divide-slate-100">
            {others.map((p: any, idx: number) => {
              const rank = idx + 4;
              const isMe = p.user_id === user?.id;
              
              if (isMe) {
                return (
                  <div key={p.user_id} className="flex items-center gap-4 px-6 py-3 relative bg-indigo-50/80 ring-1 ring-indigo-500/50 z-10 shadow-sm rounded-lg mx-2 my-2">
                    <span className="w-6 text-center font-bold text-indigo-700">{rank}</span>
                    <div className="relative">
                      <img src={(p.profiles as any)?.avatar_url || "https://i.pravatar.cc/150"} className="h-10 w-10 rounded-full border-2 border-indigo-500" alt="" />
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 border border-white">
                        <ShieldCheck size={10} className="text-white" />
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-indigo-900 flex items-center gap-2">
                        {(p.profiles as any)?.display_name || "Học viên"}
                        <span className="rounded bg-indigo-200 px-1.5 text-[10px] uppercase text-indigo-800">You</span>
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Flame size={12} className="text-orange-500 fill-orange-500" /> {p.current_streak} ngày
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-indigo-700">{p.total_xp} XP</p>
                    </div>
                  </div>
                );
              }

              return (
                <div key={p.user_id} className="flex items-center gap-4 px-6 py-3">
                  <span className="w-6 text-center font-bold text-slate-400">{rank}</span>
                  <img src={(p.profiles as any)?.avatar_url || "https://i.pravatar.cc/150"} className="h-10 w-10 rounded-full border border-slate-200" alt="" />
                  <div className="flex-1">
                    <p className="font-bold text-slate-800">{(p.profiles as any)?.display_name || "Học viên"}</p>
                    {p.current_streak > 0 && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Flame size={12} className="text-orange-500 fill-orange-500" /> {p.current_streak} ngày
                      </p>
                    )}
                  </div>
                  <span className="font-black text-slate-700">{p.total_xp} XP</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Safe Zone */}
        <div className="bg-white">
          <div className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">
            Khu vực an toàn
          </div>
          <div className="divide-y divide-slate-100">
            <div className="flex items-center gap-4 px-6 py-3 opacity-70">
              <span className="w-6 text-center font-bold text-slate-400">11</span>
              <div className="h-10 w-10 rounded-full bg-slate-200" />
              <div className="flex-1">
                <div className="h-4 w-24 rounded bg-slate-200 mb-2" />
                <div className="h-3 w-16 rounded bg-slate-100" />
              </div>
              <div className="h-5 w-16 rounded bg-slate-200" />
            </div>
            {/* ... other middle players ... */}
          </div>
        </div>

        {/* Demotion Zone */}
        <div className="bg-red-50/30 border-t-2 border-red-200 relative">
          <div className="px-6 py-2 text-xs font-bold uppercase tracking-widest text-red-500">
            Khu vực rớt hạng (Bottom 5 xuống Vàng 🔻)
          </div>
          <div className="divide-y divide-red-100/50">
            <div className="flex items-center gap-4 px-6 py-3">
              <span className="w-6 text-center font-bold text-red-400">26</span>
              <img src="https://i.pravatar.cc/150?u=thanhmai" className="h-10 w-10 rounded-full border border-red-200 grayscale" alt="" />
              <div className="flex-1 font-bold text-slate-700">Thanh Mai</div>
              <span className="font-black text-red-500">620 XP</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
