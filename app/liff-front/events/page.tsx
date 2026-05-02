import { Suspense } from "react";
import { getPublicEvents } from "@/lib/getEventData";
import ClientEventsPage from "../ClientEventPage";

export default async function EventsPage() {
  // 1. Server ดึงข้อมูลกิจกรรม (พร้อมแคช)
  const events = await getPublicEvents();

  // 2. โยนข้อมูลไปให้หน้า Client วาดหน้าจอ
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin"></div>
        </div>
      }
    >
      <ClientEventsPage events={events} />
    </Suspense>
  );
}