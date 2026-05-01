"use client";

import { createContext, useContext, useEffect, useState } from "react";
import liff from "@line/liff";

// ⚠️ ในโปรเจกต์จริง ใช้บรรทัดล่างนี้เพื่อเปิดระบบ Routing ของ Next.js
import { useRouter, usePathname } from "next/navigation";

// ⚠️ MOCK สำหรับแสดงผลใน Canvas ให้ไม่ Error (ในโปรเจกต์จริงลบ 2 บรรทัดนี้ได้เลย)
// const useRouter = () => ({ push: (path: string) => console.log("Navigate to:", path) });
// const usePathname = () => "/liff-front";

export const LiffContext = createContext<{ 
  profile: any; 
  isReady: boolean;
  theme: string;
  toggleTheme: () => void;
}>({
  profile: null,
  isReady: false,
  theme: 'light',
  toggleTheme: () => {},
});

export const useLiff = () => useContext(LiffContext);

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [theme, setTheme] = useState('light');

  // นำ Navigation Hooks มาไว้ใน Layout
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedTheme = localStorage.getItem('school-theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }

    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) console.warn("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID");

        await liff.init({ liffId: liffId || "MOCK_LIFF_ID" });
        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);
        } else {
          // ❌ ปิดการล็อกอินอัตโนมัติ เพื่อให้ผู้ใช้ค้างอยู่หน้าแรก และต้องกดปุ่ม "เข้าสู่ระบบด้วย LINE" เอง
          // liff.login(); 
          setProfile(null); 
        }
        setIsReady(true);
      } catch (error: any) {
        console.error("LIFF Init Error:", error);
        setProfile({ userId: "U_MOCK_USER_ID", displayName: "ผู้ใช้งานระบบ (Demo)" });
        setIsReady(true);
      }
    };

    initLiff();
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('school-theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('school-theme', 'light');
    }
  };

  if (liffError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-red-50 p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">เกิดข้อผิดพลาด</h2>
          <p className="text-red-500">{liffError}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">กำลังเชื่อมต่อระบบ LINE...</p>
        </div>
      </div>
    );
  }

  return (
    <LiffContext.Provider value={{ profile, isReady, theme, toggleTheme }}>
      <div className="liff-container min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
        
        {/* พื้นที่สำหรับแสดงเนื้อหาแต่ละหน้า (Page Content) */}
        {/* เพิ่ม pb-20 เพื่อไม่ให้แถบเมนูด้านล่างไปบังเนื้อหาส่วนท้าย */}
        <div className="pb-20">
          {children}
        </div>

        {/* ย้าย Bottom Navigation มาไว้ตรงนี้ ให้แสดงตลอดทุกหน้า (เมื่อ Login แล้วเท่านั้น) */}
        {profile && (
          <nav className="fixed bottom-0 w-full bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.03)] z-50 transition-colors">
            <div className="flex justify-around md:justify-center md:gap-24 items-center h-16 md:h-20 max-w-7xl mx-auto">
              
              {/* ปุ่มหน้าแรก */}
              <button 
                onClick={() => router.push('/liff-front')}
                className={`flex flex-col items-center gap-1 w-16 md:w-24 group transition-colors ${
                  pathname === '/liff-front' || pathname === '/liff-front/' 
                    ? 'text-[#06C755]' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-6 h-6 md:w-7 md:h-7 group-hover:-translate-y-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span className="text-[9px] md:text-[11px] font-bold">หน้าแรก</span>
              </button>
              
              {/* ปุ่มปฏิทิน */}
              <button 
                onClick={() => router.push('/liff-front/events')} 
                className={`flex flex-col items-center gap-1 w-16 md:w-24 group transition-colors ${
                  pathname.includes('/events') 
                    ? 'text-[#06C755]' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-6 h-6 md:w-7 md:h-7 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-[9px] md:text-[11px] font-bold">ปฏิทิน</span>
              </button>
              
              {/* ปุ่มโปรไฟล์ */}
              <button 
                onClick={() => router.push('/liff-front/profile')} 
                className={`flex flex-col items-center gap-1 w-16 md:w-24 group transition-colors ${
                  pathname.includes('/profile') || pathname.includes('/register')
                    ? 'text-[#06C755]' 
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <svg className="w-6 h-6 md:w-7 md:h-7 group-hover:-translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[9px] md:text-[11px] font-bold">โปรไฟล์</span>
              </button>
            </div>
          </nav>
        )}

      </div>
    </LiffContext.Provider>
  );
}