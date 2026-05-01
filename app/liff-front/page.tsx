"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { useRouter, usePathname } from "next/navigation"; // ⚠️ ในโปรเจกต์จริง ให้ใช้บรรทัดนี้นะครับ
import Image from "next/image";
import { useLiff } from "./layout"; 



import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User } from "firebase/auth";
import EventList from "../components/Event";

let app: any, auth: any, appId = 'default-app-id';

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

const mockGallery = [
  { id: 1, url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop", title: "กีฬาสี 68" },
  { id: 2, url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop", title: "เข้าค่าย" },
  { id: 3, url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop", title: "ประชุม" },
  { id: 4, url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop", title: "รับรางวัล" },
];

export default function LiffModernHomePage() {
  const { profile, isReady, theme, toggleTheme } = useLiff();
  
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname(); 
  const [fbUser, setFbUser] = useState<User | null>(null);

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

  // 🆕 ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    if (typeof window !== "undefined" && liff.isLoggedIn && liff.isLoggedIn()) {
      liff.logout();
      window.location.reload();
    } else {
      alert("ออกจากระบบเรียบร้อย");
    }
  };

  if (isReady && !profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 w-full mx-auto transition-colors">
        <div className="w-24 h-24 bg-[#06C755]/10 rounded-full flex items-center justify-center mb-8">
          <svg viewBox="0 0 40 40" className="w-14 h-14" fill="none">
            <rect width="40" height="40" rx="10" fill="#06C755" />
            <path d="M33 18.5c0-6.35-6.37-11.5-14.2-11.5C11.07 7 5 12.15 5 18.5c0 5.69 5.05 10.45 11.87 11.35.46.1 1.09.3 1.25.7.14.35.09.9.04 1.25l-.2 1.22c-.06.36-.28 1.4 1.23.77 1.5-.63 8.12-4.78 11.08-8.19C32.07 23.3 33 21.02 33 18.5z" fill="white" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ไทยงามธุรการ</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10 text-sm">ระบบจัดการข้อมูลภายในโรงเรียน<br/>กรุณาเข้าสู่ระบบเพื่อใช้งาน</p>
        <button onClick={handleLogin} className="w-full max-w-sm py-4 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200 transition-all active:scale-95">
          เข้าสู่ระบบด้วย LINE
        </button>
      </div>
    );
  }

  return (
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
        
        {/* กลุ่มเมนูด้านขวา (ออกจากระบบ + เปลี่ยนธีม + โปรไฟล์) */}
        <div className="flex items-center gap-3 md:gap-4">
          
          {/* 🆕 🚪 ปุ่มออกจากระบบ */}
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 flex items-center justify-center text-lg md:text-xl transition-all active:scale-95 shadow-sm"
            aria-label="Logout"
            title="ออกจากระบบ"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

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
            <button onClick={() => router.push("/")} className="flex flex-col items-center group">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-emerald-100 text-emerald-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl mb-2 group-hover:-translate-y-1 group-active:scale-95 transition-all shadow-sm">⚙️</div>
              <span className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">คุยกับธุรการ</span>
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
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">ปฏิทินกิจกรรม 📅</h2>
            <button 
              onClick={() => router.push('/liff-front/events')} 
              className="text-xs md:text-sm text-[#06C755] font-semibold hover:underline"
            >
              ดูทั้งหมด
            </button>
          </div>
          
          <EventList compactMode={true} />
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