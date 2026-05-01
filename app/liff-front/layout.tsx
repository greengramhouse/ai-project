"use client";

import { createContext, useContext, useEffect, useState } from "react";
import liff from "@line/liff";

// 🆕 1. สร้าง Context สำหรับเก็บข้อมูล LIFF Profile เพื่อส่งให้ทุกหน้า
export const LiffContext = createContext<{ profile: any; isReady: boolean }>({
  profile: null,
  isReady: false,
});

// 🆕 2. สร้าง Custom Hook ให้หน้าอื่นๆ เรียกใช้งานได้ง่ายๆ
export const useLiff = () => useContext(LiffContext);

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<any>(null); // State เก็บ Profile
  const [liffError, setLiffError] = useState<string | null>(null);

  useEffect(() => {
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          console.warn("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID ในไฟล์ .env");
        }

        await liff.init({ liffId: liffId || "MOCK_LIFF_ID" });
        
        // 🆕 3. เมื่อ init สำเร็จ ให้ดึง Profile เลย
        if (liff.isLoggedIn()) {
          const userProfile = await liff.getProfile();
          setProfile(userProfile);
          console.log("LIFF Profile:", userProfile);
        } else {
          liff.login();
        }
        
        setIsReady(true);
      } catch (error: any) {
        console.error("LIFF Init Error:", error);
        // Fallback เพื่อให้รันทดสอบบนเบราว์เซอร์ปกติได้
        setProfile({ userId: "U_MOCK_USER_ID", displayName: "ผู้ใช้งานระบบ (Demo)" });
        setIsReady(true);
      }
    };

    initLiff();
  }, []);

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
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังเชื่อมต่อระบบ LINE...</p>
        </div>
      </div>
    );
  }

  // 🆕 4. ครอบ children ด้วย Provider พร้อมส่งค่า Profile ลงไป
  return (
    <LiffContext.Provider value={{ profile, isReady }}>
      <div className="liff-container min-h-screen bg-gray-50">{children}</div>
    </LiffContext.Provider>
  );
}