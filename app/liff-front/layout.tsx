"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";

export default function LiffLayout({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);

  useEffect(() => {
    // ฟังก์ชันสำหรับ Initial LIFF
    const initLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          throw new Error("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID ในไฟล์ .env");
        }

        await liff.init({ liffId: liffId });
        setIsReady(true);
      } catch (error: any) {
        console.error("LIFF Init Error:", error);
        setLiffError(error.message);
      }
    };

    initLiff();
  }, []);

  // แสดงหน้าจอ Error หากตั้งค่า LIFF ไม่สำเร็จ
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

  // แสดงหน้าจอโหลดระหว่างรอ LIFF Init
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

  // ถ้าโหลดสำเร็จแล้ว ให้แสดง Content ของหน้าย่อยๆ (children) ได้เลย
  return <div className="liff-container min-h-screen bg-gray-50">{children}</div>;
}