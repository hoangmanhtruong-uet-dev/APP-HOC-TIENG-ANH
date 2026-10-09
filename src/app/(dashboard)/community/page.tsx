"use client";

import React from "react";
import { 
  MessageSquare, 
  Users, 
  HelpCircle, 
  PenTool, 
  Mic, 
  Award, 
  ArrowUp, 
  ArrowDown, 
  MessageCircle, 
  Bookmark,
  CheckCircle2,
  MoreHorizontal,
  Video,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-6xl flex flex-col lg:flex-row gap-6 items-start">
      
      {/* Left Column (20%): Categories */}
      <div className="w-full lg:w-1/4 space-y-6">
        <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-sm h-12 rounded-xl">
          <Plus size={18} /> Tạo bài viết mới
        </Button>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 px-2">
            Chủ đề thảo luận
          </h3>
          <div className="space-y-1">
            <button className="w-full flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2 text-indigo-700 font-bold transition-colors">
              <span className="flex items-center gap-3"><MessageSquare size={18} /> Tất cả bài viết</span>
            </button>
            <button className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-3"><HelpCircle size={18} /> Hỏi đáp thắc mắc</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">12</span>
            </button>
            <button className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-3"><PenTool size={18} /> Chữa bài Writing</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-600 font-bold">3 mới</span>
            </button>
            <button className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-3"><Mic size={18} /> Luyện Speaking</span>
            </button>
            <button className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-slate-600 font-semibold hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-3"><Users size={18} /> Tìm bạn học chung</span>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm bg-gradient-to-br from-white to-amber-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Award className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Điểm danh tiếng</p>
              <p className="text-xl font-black text-amber-700">1,250 <span className="text-sm font-medium">Karma</span></p>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-3">
            Tích cực giúp đỡ mọi người để đổi lấy Ebook Pro và lượt chấm bài AI miễn phí!
          </p>
          <Button variant="secondary" size="sm" className="w-full text-amber-700 bg-white border-amber-200 hover:bg-amber-50">
            Đổi quà
          </Button>
        </div>
      </div>

      {/* Middle Column (55%): Feed */}
      <div className="w-full lg:w-1/2 space-y-6">
        
        {/* Post Card 1: Question */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="https://i.pravatar.cc/150?u=userA" alt="" className="h-10 w-10 rounded-full" />
              <div>
                <p className="font-bold text-slate-800 text-sm">Minh Quân</p>
                <p className="text-xs text-slate-500">2 giờ trước</p>
              </div>
            </div>
            <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 flex items-center gap-1">
              <HelpCircle size={12} /> Hỏi đáp
            </span>
          </div>
          
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            Cho mình hỏi sự khác biệt giữa "however" và "nevertheless" trong Writing Task 2?
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-3">
            Mình hay dùng however ở đầu câu để thể hiện sự tương phản, nhưng thấy các bài mẫu band cao hay dùng nevertheless. Cho mình hỏi 2 từ này có thể thay thế hoàn toàn cho nhau không, hay có sắc thái nào khác biệt ạ?
          </p>
          
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1 rounded-full bg-slate-50 p-1 border border-slate-200">
              <button className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200 hover:text-emerald-600 transition-colors">
                <ArrowUp size={16} />
              </button>
              <span className="font-bold text-slate-700 text-sm min-w-[20px] text-center">42</span>
              <button className="rounded-full p-1.5 text-slate-500 hover:bg-slate-200 hover:text-red-600 transition-colors">
                <ArrowDown size={16} />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
                <MessageCircle size={16} /> 12 Phản hồi
              </button>
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <Bookmark size={18} />
              </button>
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Post Card 2: Peer Review */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 pb-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <img src="https://i.pravatar.cc/150?u=userB" alt="" className="h-10 w-10 rounded-full" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">Hương Ly</p>
                  <p className="text-xs text-slate-500">4 giờ trước</p>
                </div>
              </div>
              <span className="rounded bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600 border border-rose-100 flex items-center gap-1">
                <PenTool size={12} /> Nhờ chấm bài
              </span>
            </div>
            
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Nhờ mọi người review giúp Task 1 (Line graph) Target 6.5+
            </h2>
            
            {/* Inline Peer Review Interface */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 font-mono text-sm leading-loose text-slate-700 mb-4">
              <span className="bg-yellow-200 px-1 cursor-pointer group relative">
                The chart gives information about
                <div className="absolute left-0 top-full mt-2 hidden w-64 rounded-lg bg-white p-3 shadow-xl border border-slate-200 group-hover:block z-10">
                  <div className="flex items-start gap-2">
                    <img src="https://i.pravatar.cc/150?u=mentor" className="w-6 h-6 rounded-full" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Mentor Tuấn Anh</p>
                      <p className="text-xs font-sans text-slate-600 mt-1 leading-normal">Đừng dùng "gives information about", nó quá phổ biến. Thử dùng "illustrates" hoặc "depicts".</p>
                    </div>
                  </div>
                </div>
              </span> 
              {" "}the number of people who migrated to three different countries over a period of 10 years...
            </div>
          </div>
          
          <div className="flex items-center justify-between p-5 pt-4 bg-slate-50/50 border-t border-slate-100">
            <div className="flex items-center gap-1 rounded-full bg-white p-1 border border-slate-200 shadow-sm">
              <button className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-600">
                <ArrowUp size={16} />
              </button>
              <span className="font-bold text-slate-700 text-sm min-w-[20px] text-center">8</span>
              <button className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-red-600">
                <ArrowDown size={16} />
              </button>
            </div>
            
            <button className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-indigo-600">
              <MessageCircle size={16} /> 5 Nhận xét
            </button>
          </div>
        </div>

      </div>

      {/* Right Column (25%): Widgets */}
      <div className="w-full lg:w-1/4 space-y-6">
        
        {/* Mentors Widget */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            Trợ giảng đang Online
          </h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="https://i.pravatar.cc/150?u=mentor1" className="w-10 h-10 rounded-full border border-slate-200" />
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">Tuấn Anh</p>
                <p className="text-xs text-slate-500">IELTS 8.5</p>
              </div>
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
                <MessageSquare size={14} />
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src="https://i.pravatar.cc/150?u=mentor2" className="w-10 h-10 rounded-full border border-slate-200" />
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-sm">Phương Thảo</p>
                <p className="text-xs text-slate-500">IELTS 8.0</p>
              </div>
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
                <MessageSquare size={14} />
              </Button>
            </div>
          </div>
        </div>

        {/* Live Speaking Rooms */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50 to-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <Video size={16} className="text-indigo-600" />
            Phòng Speaking Trực tiếp
          </h3>
          
          <div className="rounded-xl border border-indigo-100 bg-white p-3 shadow-sm transition-all hover:shadow-md cursor-pointer group">
            <div className="flex items-center justify-between mb-2">
              <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> LIVE
              </span>
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Users size={12} /> 2/2
              </span>
            </div>
            <p className="font-bold text-slate-800 text-sm mb-2 group-hover:text-indigo-600 transition-colors">
              Chém Part 1: Hobbies & Work
            </p>
            <div className="flex items-center gap-2">
               <div className="flex -space-x-2">
                  <img src="https://i.pravatar.cc/150?u=s1" className="w-6 h-6 rounded-full border-2 border-white" />
                  <img src="https://i.pravatar.cc/150?u=s2" className="w-6 h-6 rounded-full border-2 border-white" />
               </div>
               <span className="text-xs text-slate-500 font-medium">Đang nói... (Kín)</span>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4 mt-3 text-center cursor-pointer hover:bg-indigo-50 transition-colors">
            <Button variant="ghost" className="text-indigo-600 gap-2 font-bold h-auto p-0 hover:bg-transparent">
              <Plus size={16} /> Tạo phòng mới
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
