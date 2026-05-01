"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useLiff } from "./layout"; // 🆕 นำเข้า Context จาก layout เพื่อใช้งาน Theme

// 🆕 Import Firebase SDK
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ==========================================
// 🔧 ตั้งค่า Firebase
// ==========================================
let app: any, auth: any, db: any, appId = 'default-app-id';

if (typeof window !== "undefined") {
  try {
    const firebaseConfig = typeof (window as any).__firebase_config !== 'undefined' 
      ? JSON.parse((window as any).__firebase_config) 
      : {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        };

    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    
    if (typeof (window as any).__app_id !== 'undefined') {
      appId = (window as any).__app_id;
    }
  } catch (error) {
    console.error("Firebase init error:", error);
  }
}

// --- Mock Data ---
const mockNews = [
  { id: 1, title: "กำหนดการสอบกลางภาค 1/2569", date: "15 พ.ค. 2569", tag: "วิชาการ", color: "bg-blue-500" },
  { id: 2, title: "อบรมการใช้ AI สำหรับครู", date: "20 พ.ค. 2569", tag: "อบรม", color: "bg-purple-500" },
  { id: 3, title: "แจ้งปรับปรุงระบบอินเทอร์เน็ต", date: "25 พ.ค. 2569", tag: "ประกาศ", color: "bg-orange-500" },
  { id: 4, title: "กิจกรรมวันแม่แห่งชาติ", date: "12 ส.ค. 2569", tag: "กิจกรรม", color: "bg-pink-500" },
];

const mockEvents = [
  { id: 1, date: "10", month: "พ.ค.", title: "ประชุมประจำเดือน", time: "09:00 - 12:00 น." },
  { id: 2, date: "12", month: "พ.ค.", title: "วันปัจฉิมนิเทศ", time: "08:30 - 15:00 น." },
];

const mockGallery = [
  { id: 1, url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop", title: "กีฬาสี 68" },
  { id: 2, url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop", title: "เข้าค่าย" },
  { id: 3, url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop", title: "ประชุม" },
  { id: 4, url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop", title: "รับรางวัล" },
];

export default function LiffModernHomePage() {
  // 🆕 รับ Profile และระบบ Theme มาจาก Layout
  const { profile, isReady, theme, toggleTheme } = useLiff();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();
  const [fbUser, setFbUser] = useState<User | null>(null);

  // Firebase Auth Init
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        const globalToken = (window as any).__initial_auth_token;
        if (typeof globalToken !== 'undefined' && globalToken) {
          await signInWithCustomToken(auth, globalToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Authentication Error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    liff.login();
  };

  // ==========================================
  // 🔴 หน้าจอตอนยังไม่ Login
  // ==========================================
  if (isReady && !profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 w-full mx-auto transition-colors">
        <div className="w-24 h-24 bg-[#06C755]/10 rounded-full flex items-center justify-center mb-8">
          <svg viewBox="0 0 40 40" className="w-14 h-14" fill="none">
            <rect width="40" height="40" rx="10" fill="#06C755" />
            <path d="M33 18.5c0-6.35-6.37-11.5-14.2-11.5C11.07 7 5 12.15 5 18.5c0 5.69 5.05 10.45 11.87 11.35.46.1 1.09.3 1.25.7.14.35.09.9.04 1.25l-.2 1.22c-.06.36-.28 1.4 1.23.77 1.5-.63 8.12-4.78 11.08-8.19C32.07 23.3 33 21.02 33 18.5z" fill="white" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">School Portal</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10 text-sm">ระบบจัดการข้อมูลภายในโรงเรียน<br/>กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
        <button onClick={handleLogin} className="w-full max-w-sm py-4 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200 transition-all active:scale-95">
          เข้าสู่ระบบด้วย LINE
        </button>
      </div>
    );
  }

  // ==========================================
  // 🟢 หน้าจอหลัก (Main Dashboard)
  // ==========================================
  return (
    // 🎨 เพิ่มคลาส dark:bg-gray-900 ให้รองรับโหมดมืด
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 w-full mx-auto relative transition-colors duration-300">
      
      {/* 1. App Header */}
      <header className="bg-white dark:bg-gray-800 px-5 md:px-10 lg:px-20 pt-8 pb-4 sticky top-0 z-40 shadow-sm flex justify-between items-center transition-colors">
        <div className="flex-1">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-0.5">สวัสดีครับ/ค่ะ ☀️</p>
          {!isReady ? (
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
          ) : (
            <h1 className="text-xl md:text-2xl font-extrabold text-gray-800 dark:text-white truncate">
              {profile?.displayName || "คุณครู"}
            </h1>
          )}
        </div>
        
        {/* 🆕 กลุ่มเมนูด้านขวา (ปุ่มเปลี่ยนธีม + โปรไฟล์) */}
        <div className="flex items-center gap-3 md:gap-4">
          
          {/* ☀️/🌙 ปุ่มสลับธีม */}
          <button 
            onClick={toggleTheme}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-lg md:text-xl transition-all active:scale-95 shadow-sm"
            aria-label="Toggle Dark Mode"
          >
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          {/* รูปโปรไฟล์ */}
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden border-2 border-[#06C755] p-0.5 shadow-sm">
            {profile?.pictureUrl ? (
              <img src={profile.pictureUrl} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <div className="w-full h-full bg-[#06C755] rounded-full flex items-center justify-center text-white font-bold text-lg">
                {profile?.displayName?.[0] || "U"}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 md:px-10 lg:px-20 pt-6 space-y-8 md:space-y-12 max-w-7xl mx-auto">
        
        {/* 2. Quick Actions */}
        <section>
          <div className="grid grid-cols-4 gap-4 md:gap-8">
            <button onClick={() => router.push("/liff-front/register")} className="flex flex-col items-center group">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-100 text-blue-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl mb-2 group-hover:-translate-y-1 group-active:scale-95 transition-all shadow-sm">📝</div>
              <span className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">ลงทะเบียน</span>
            </button>
            <button onClick={() => router.push("/liff-front/student-table")} className="flex flex-col items-center group">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-purple-100 text-purple-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl mb-2 group-hover:-translate-y-1 group-active:scale-95 transition-all shadow-sm">📋</div>
              <span className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">รายชื่อนักเรียน</span>
            </button>
            <button onClick={() => router.push("/liff-front/doccheck")} className="flex flex-col items-center group">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-orange-100 text-orange-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl mb-2 group-hover:-translate-y-1 group-active:scale-95 transition-all shadow-sm">📄</div>
              <span className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">เอกสาร</span>
            </button>
            <button className="flex flex-col items-center group">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-emerald-100 text-emerald-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl mb-2 group-hover:-translate-y-1 group-active:scale-95 transition-all shadow-sm">⚙️</div>
              <span className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">ออกเลขหนังสือ</span>
            </button>
          </div>
        </section>

        {/* 3. News & Announcements */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">ข่าวประชาสัมพันธ์ 📢</h2>
            <button className="text-xs md:text-sm text-[#06C755] font-semibold hover:underline">ดูทั้งหมด</button>
          </div>
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x hide-scrollbar -mx-5 px-5 md:mx-0 md:px-0">
            {mockNews.map((news) => (
              <div key={news.id} className="min-w-60 md:min-w-[320px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 shadow-sm snap-start relative overflow-hidden hover:shadow-md transition-all cursor-pointer shrink-0">
                <div className={`absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 ${news.color} opacity-10 dark:opacity-20 rounded-bl-full`} />
                <span className={`inline-block px-2.5 py-1 ${news.color} bg-opacity-10 dark:bg-opacity-20 ${news.color.replace('bg-', 'text-')} dark:text-opacity-90 text-[10px] md:text-xs font-bold rounded-lg mb-3 md:mb-4`}>
                  {news.tag}
                </span>
                <h3 className="font-bold text-gray-800 dark:text-white text-sm md:text-base mb-1 line-clamp-2">{news.title}</h3>
                <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 mt-2">📅 {news.date}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Upcoming Events */}
        <section>
          <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white mb-4">ปฏิทินกิจกรรม 📅</h2>
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-2 md:p-4 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            {mockEvents.map((ev, index) => (
              <div key={ev.id} className={`flex items-center gap-4 md:gap-6 p-3 md:p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors cursor-pointer ${index !== mockEvents.length - 1 ? 'border-b border-gray-50 dark:border-gray-700' : ''}`}>
                <div className="bg-red-50 dark:bg-red-500/10 text-red-500 rounded-2xl w-14 h-14 md:w-16 md:h-16 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-sm md:text-lg font-black leading-none">{ev.date}</span>
                  <span className="text-[10px] md:text-xs font-semibold">{ev.month}</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white text-sm md:text-base">{ev.title}</h4>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                    <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {ev.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Photo Gallery */}
        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">ภาพกิจกรรม 📸</h2>
            <button className="text-xs md:text-sm text-[#06C755] font-semibold hover:underline">แกลลอรี่</button>
          </div>
          
          <div className="flex gap-3 md:gap-6 overflow-x-auto snap-x hide-scrollbar -mx-5 px-5 md:mx-0 md:px-0 pb-6">
            {mockGallery.map((img) => (
              <div 
                key={img.id} 
                onClick={() => setSelectedImage(img.url)}
                className="min-w-40 md:min-w-70 lg:min-w-[320px] h-32 md:h-48 lg:h-56 bg-gray-200 dark:bg-gray-700 rounded-2xl relative overflow-hidden group snap-start cursor-pointer shadow-sm shrink-0"
              >
                <Image 
                  src={img.url} 
                  alt={img.title} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  width={400}
                  height={300}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 md:bottom-4 left-3 md:left-4 text-white text-xs md:text-base font-bold drop-shadow-md">
                  {img.title}
                </div>
              </div>
            ))}
          </div>
        </section>
        
      </main>

      {/* 6. Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-40 transition-colors">
        <div className="flex justify-around md:justify-center md:gap-24 items-center h-16 md:h-20 max-w-7xl mx-auto">
          <button className="flex flex-col items-center gap-1 text-[#06C755] w-16 md:w-24 group">
            <svg className="w-6 h-6 md:w-7 md:h-7 group-hover:-translate-y-1 transition-transform" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[9px] md:text-[11px] font-bold">หน้าแรก</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 w-16 md:w-24 group transition-colors">
            <svg className="w-6 h-6 md:w-7 md:h-7 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-[9px] md:text-[11px] font-bold">ปฏิทิน</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 w-16 md:w-24 group transition-colors">
            <svg className="w-6 h-6 md:w-7 md:h-7 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[9px] md:text-[11px] font-bold">โปรไฟล์</span>
          </button>
        </div>
      </nav>

      {/* 7. Image Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 md:top-10 md:right-10 w-10 h-10 md:w-14 md:h-14 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors z-[60]"
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div 
            className="relative w-full max-w-5xl h-[85vh] z-50"
            onClick={(e) => e.stopPropagation()}
          >
            <Image 
              src={selectedImage} 
              alt="Full screen view" 
              fill
              className="rounded-lg object-contain shadow-2xl cursor-default"
            />
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        }
      `}} />
    </div>
  );
}