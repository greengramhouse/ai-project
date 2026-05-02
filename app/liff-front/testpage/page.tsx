import EventListja from "@/app/components/EventListCach";
import { getPublicEvents } from "@/lib/getEventData";
import { Suspense } from "react";

// 1. สร้าง Server Component ตัวกลางเพื่อทำหน้าที่รอข้อมูล (Await)
async function EventListWrapper() {
  const events = await getPublicEvents(); // รอข้อมูลจาก Firebase / Cache

  return <EventListja events={events} compactMode={true} />;
}

export default async function HomePage() {
  return (
    <main className="...">
      <h2>ปฏิทินกิจกรรม 📅</h2>
      {/* 2. นำ <Suspense> มาครอบ Wrapper ไว้ และใส่หน้าตาตอนโหลด (fallback) */}
      <Suspense
        fallback={
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 flex flex-col items-center justify-center border border-gray-100">
            <div className="w-10 h-10 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
            <p className="text-sm text-gray-400 font-medium">
              กำลังโหลดกิจกรรม...
            </p>
          </div>
        }
      >
        <EventListWrapper />
      </Suspense>
    </main>
  );
}
