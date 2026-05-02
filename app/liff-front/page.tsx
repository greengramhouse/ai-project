import { Suspense } from "react";
import ClientPage from "./ClientPage"; 
import { getPublicEvents } from "@/lib/getEventData"; 
import { getPublicNews } from "@/lib/getNewsData"; // 👈 1. นำเข้าฟังก์ชันดึงข่าว

export default async function LiffModernHomePage() {
  // 2. รันฟังก์ชันดึงข้อมูลทั้ง 2 อย่างพร้อมกัน
  const [events, news] = await Promise.all([
    getPublicEvents(),
    getPublicNews()
  ]);

  // 3. โยนข้อมูล events และ news แบบสำเร็จรูปเข้าไปให้ Client Component
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin"></div>
        </div>
      }
    >
      <ClientPage initialEvents={events} initialNews={news} /> {/* 👈 เพิ่ม initialNews ตรงนี้ */}
    </Suspense>
  );
}