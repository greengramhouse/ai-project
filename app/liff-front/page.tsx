"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { useRouter } from "next/navigation";

type Profile = {
  displayName: string;
  pictureUrl?: string;
  userId: string;
};

// --- Mock Data (ข้อมูลจำลองสำหรับแสดงผล) ---
const mockNews = [
  { id: 1, title: "กำหนดการสอบกลางภาค 1/2569", date: "15 พ.ค. 2569", tag: "วิชาการ", color: "bg-blue-500" },
  { id: 2, title: "อบรมการใช้ AI สำหรับครู", date: "20 พ.ค. 2569", tag: "อบรม", color: "bg-purple-500" },
  { id: 3, title: "แจ้งปรับปรุงระบบอินเทอร์เน็ต", date: "25 พ.ค. 2569", tag: "ประกาศ", color: "bg-orange-500" },
];

const mockEvents = [
  { id: 1, date: "10", month: "พ.ค.", title: "ประชุมประจำเดือน", time: "09:00 - 12:00 น." },
  { id: 2, date: "12", month: "พ.ค.", title: "วันปัจฉิมนิเทศ", time: "08:30 - 15:00 น." },
];

export default function LiffModernHomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (liff.isLoggedIn()) {
      liff.getProfile().then((p) => {
        setProfile(p);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogin = () => {
    liff.login();
  };

  // ==========================================
  // 🔴 หน้าจอตอนยังไม่ Login (Login Screen)
  // ==========================================
  if (!loading && !profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 max-w-lg mx-auto shadow-2xl">
        <div className="w-24 h-24 bg-[#06C755]/10 rounded-full flex items-center justify-center mb-8">
          <svg viewBox="0 0 40 40" className="w-14 h-14" fill="none">
            <rect width="40" height="40" rx="10" fill="#06C755" />
            <path d="M33 18.5c0-6.35-6.37-11.5-14.2-11.5C11.07 7 5 12.15 5 18.5c0 5.69 5.05 10.45 11.87 11.35.46.1 1.09.3 1.25.7.14.35.09.9.04 1.25l-.2 1.22c-.06.36-.28 1.4 1.23.77 1.5-.63 8.12-4.78 11.08-8.19C32.07 23.3 33 21.02 33 18.5z" fill="white" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">School Portal</h1>
        <p className="text-gray-500 text-center mb-10 text-sm">ระบบจัดการข้อมูลภายในโรงเรียน<br/>กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
        <button onClick={handleLogin} className="w-full py-4 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200 transition-all active:scale-95">
          เข้าสู่ระบบด้วย LINE
        </button>
      </div>
    );
  }

  // ==========================================
  // 🟢 หน้าจอหลัก (Main Dashboard)
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 pb-24 max-w-md mx-auto shadow-2xl relative overflow-hidden">
      
      {/* 1. App Header (Sticky) */}
      <header className="bg-white px-5 pt-8 pb-4 sticky top-0 z-40 shadow-sm flex justify-between items-center">
        <div className="flex-1">
          <p className="text-xs text-gray-500 font-medium mb-0.5">สวัสดีครับ/ค่ะ ☀️</p>
          {loading ? (
            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded-md"></div>
          ) : (
            <h1 className="text-xl font-extrabold text-gray-800 truncate">
              {profile?.displayName || "คุณครู"}
            </h1>
          )}
        </div>
        <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border-2 border-[#06C755] p-0.5">
          {profile?.pictureUrl ? (
            <img src={profile.pictureUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[#06C755] rounded-full flex items-center justify-center text-white font-bold">
              {profile?.displayName?.[0] || "U"}
            </div>
          )}
        </div>
      </header>

      <main className="px-5 pt-6 space-y-8">
        
        {/* 2. Quick Actions (เมนูด่วน) */}
        <section>
          <div className="grid grid-cols-4 gap-4">
            <button onClick={() => router.push("/liff-front/register")} className="flex flex-col items-center group">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-2 group-active:scale-95 transition-transform">📝</div>
              <span className="text-[11px] text-gray-600 font-medium text-center">ลงทะเบียน</span>
            </button>
            <button onClick={() => router.push("/liff-front/table")} className="flex flex-col items-center group">
              <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-2xl mb-2 group-active:scale-95 transition-transform">📋</div>
              <span className="text-[11px] text-gray-600 font-medium text-center">รายชื่อครู</span>
            </button>
            <button className="flex flex-col items-center group">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center text-2xl mb-2 group-active:scale-95 transition-transform">📄</div>
              <span className="text-[11px] text-gray-600 font-medium text-center">เอกสาร</span>
            </button>
            <button className="flex flex-col items-center group">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mb-2 group-active:scale-95 transition-transform">⚙️</div>
              <span className="text-[11px] text-gray-600 font-medium text-center">ตั้งค่า</span>
            </button>
          </div>
        </section>

        {/* 3. News & Announcements (ข่าวประชาสัมพันธ์ - Horizontal Scroll) */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg font-bold text-gray-800">ข่าวประชาสัมพันธ์ 📢</h2>
            <button className="text-xs text-[#06C755] font-semibold">ดูทั้งหมด</button>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar -mx-5 px-5">
            {mockNews.map((news) => (
              <div key={news.id} className="min-w-[240px] bg-white border border-gray-100 rounded-3xl p-5 shadow-sm snap-start relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-16 h-16 ${news.color} opacity-10 rounded-bl-full`} />
                <span className={`inline-block px-2.5 py-1 ${news.color} bg-opacity-10 ${news.color.replace('bg-', 'text-')} text-[10px] font-bold rounded-lg mb-3`}>
                  {news.tag}
                </span>
                <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2">{news.title}</h3>
                <p className="text-xs text-gray-400">📅 {news.date}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Upcoming Events (ปฏิทินกิจกรรม) */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">ปฏิทินกิจกรรม 📅</h2>
          <div className="bg-white rounded-3xl p-2 shadow-sm border border-gray-100">
            {mockEvents.map((ev, index) => (
              <div key={ev.id} className={`flex items-center gap-4 p-3 ${index !== mockEvents.length - 1 ? 'border-b border-gray-50' : ''}`}>
                <div className="bg-red-50 text-red-500 rounded-2xl w-14 h-14 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-sm font-black leading-none">{ev.date}</span>
                  <span className="text-[10px] font-semibold">{ev.month}</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">{ev.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {ev.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Photo Gallery (ภาพกิจกรรม) */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">ภาพกิจกรรม 📸</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* กล่องใส่รูปจำลอง (ใช้ Gradient แทนรูปจริงเพื่อให้โค้ดไม่พัง) */}
            <div className="bg-gradient-to-tr from-blue-300 to-purple-300 rounded-2xl h-32 relative overflow-hidden group">
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
              <div className="absolute bottom-2 left-2 text-white text-xs font-bold">กีฬาสี 68</div>
            </div>
            <div className="grid grid-rows-2 gap-3 h-32">
              <div className="bg-gradient-to-r from-emerald-300 to-teal-400 rounded-2xl relative overflow-hidden">
                <div className="absolute bottom-1 left-2 text-white text-[10px] font-bold">เข้าค่าย</div>
              </div>
              <div className="bg-gradient-to-r from-orange-300 to-rose-300 rounded-2xl relative overflow-hidden">
                <div className="absolute bottom-1 left-2 text-white text-[10px] font-bold">ประชุม</div>
              </div>
            </div>
          </div>
        </section>
        
      </main>

      {/* 6. Bottom Navigation (แถบเมนูด้านล่าง) */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-50">
        <div className="flex justify-around items-center h-16">
          <button className="flex flex-col items-center gap-1 text-[#06C755] w-16">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[9px] font-bold">หน้าแรก</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 w-16">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-[9px] font-bold">ปฏิทิน</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 w-16">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            <span className="text-[9px] font-bold">แจ้งเตือน</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 w-16">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[9px] font-bold">โปรไฟล์</span>
          </button>
        </div>
      </nav>

      {/* ซ่อน Scrollbar ด้วย CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}