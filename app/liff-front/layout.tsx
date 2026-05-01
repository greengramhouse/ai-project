"use client";

import { createContext, useContext, useEffect, useState } from "react";
import liff from "@line/liff";

// 1. เพิ่ม theme และ toggleTheme เข้าไปใน Context
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
  
  // 2. State สำหรับจัดการ Theme
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    // 3. เช็ค Theme จาก LocalStorage เมื่อโหลดหน้าครั้งแรก
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
        if (!liffId) {
          console.warn("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID");
        }

        await liff.init({ liffId: liffId || "MOCK_LIFF_ID" });
        
        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);
        } else {
          liff.login();
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

  // 4. ฟังก์ชันสำหรับสลับ Theme (และบันทึกลง LocalStorage)
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
          <h2 className="text-xl font-bold text-red-600 mb-2">เกิดข้อผิดพลาดกับ LIFF</h2>
          <p className="text-red-500">{liffError}</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">กำลังเชื่อมต่อระบบ LINE...</p>
        </div>
      </div>
    );
  }

  return (
    // 5. ส่งสถานะ theme และ toggleTheme ไปให้ทุกหน้าใช้งาน
    <LiffContext.Provider value={{ profile, isReady, theme, toggleTheme }}>
      {/* ใส่คลาส dark ให้ container หลักเผื่อไว้ */}
      <div className="liff-container min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors duration-300">
        {children}
      </div>
    </LiffContext.Provider>
  );
}