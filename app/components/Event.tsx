"use client";

import { useEffect, useState } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import useSWR from "swr"; 

import { useLiff } from "../liff-front/layout";

// ⚠️ หมายเหตุ: สำหรับการแสดงผลพรีวิวใน Canvas นี้ ผมได้ทำการจำลอง useLiff ขึ้นมาเพื่อให้โค้ดคอมไพล์ผ่าน
// ในโปรเจกต์ Next.js จริงของคุณ ให้ลบ mock ด้านล่างนี้ออก แล้วใช้คำสั่ง import ด้านล่างแทนนะครับ

// const useLiff = () => {
//   return { isReady: true };
// };

// ==========================================
// 🔧 ตั้งค่า Firebase
// ==========================================
let app: any, db: any, appId = 'calendar-app';

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
    db = getFirestore(app);
    
    if (typeof (window as any).__app_id !== 'undefined' && (window as any).__app_id) {
      appId = (window as any).__app_id;
    }
  } catch (error) {
    console.error("Firebase init error:", error);
  }
}

export type EventData = {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  groupId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any; 
};

// ตัวช่วยจัดรูปแบบวันที่
const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const THAI_MONTHS_FULL = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

const parseDateInfo = (dateString: string) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  
  return {
    day: d.getDate(),
    dayOfWeek: d.getDay(), // 0 = อาทิตย์, 1 = จันทร์, ...
    monthShort: THAI_MONTHS[d.getMonth()],
    monthFull: THAI_MONTHS_FULL[d.getMonth()],
    year: d.getFullYear() + 543,
    time: d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  };
};

// ฟังก์ชันกำหนดสีตามวันในสัปดาห์
const getDayColorClasses = (dayIndex: number) => {
  switch(dayIndex) {
    case 0: return "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 border-red-100 dark:border-red-800/50"; // อาทิตย์
    case 1: return "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-800/50"; // จันทร์
    case 2: return "bg-pink-50 dark:bg-pink-900/20 text-pink-500 dark:text-pink-400 border-pink-100 dark:border-pink-800/50"; // อังคาร
    case 3: return "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800/50"; // พุธ
    case 4: return "bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400 border-orange-100 dark:border-orange-800/50"; // พฤหัส
    case 5: return "bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 border-blue-100 dark:border-blue-800/50"; // ศุกร์
    case 6: return "bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400 border-purple-100 dark:border-purple-800/50"; // เสาร์
    default: return "bg-gray-50 dark:bg-gray-900/20 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-800/50"; 
  }
};

// 🆕 Component หลักที่สามารถเรียกใช้ซ้ำได้
export default function EventList({ compactMode = false }: { compactMode?: boolean }) {
  const { isReady } = useLiff();
  const [showAllEvents, setShowAllEvents] = useState(false);
  
  const fetchEvents = async (): Promise<EventData[]> => {
    if (!db) return [];
    const eventsRef = collection(db, 'artifacts', appId, 'public', 'data', 'events');
    const snapshot = await getDocs(eventsRef);
    
    let fetchedEvents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as EventData[]; 
    
    // เรียงตามวันที่จัดกิจกรรม (ล่าสุดขึ้นก่อน)
    fetchedEvents.sort((a, b) => {
      const dateA = new Date(a.start || a.createdAt || 0).getTime();
      const dateB = new Date(b.start || b.createdAt || 0).getTime();
      return dateB - dateA; 
    });

    return fetchedEvents;
  };

  const { 
    data: events = [], 
    error, 
    isLoading 
  } = useSWR<EventData[]>(
    isReady ? 'public-events' : null,
    fetchEvents,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      keepPreviousData: true, 
    }
  );

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 text-center shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="text-rose-500 font-bold mb-2">เกิดข้อผิดพลาด</div>
        <p className="text-sm text-gray-500 dark:text-gray-400">ไม่สามารถดึงข้อมูลกิจกรรมได้</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 flex flex-col items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="w-10 h-10 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-sm text-gray-400 dark:text-gray-500 font-medium tracking-wide">กำลังโหลดกิจกรรม...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner transition-colors">📅</div>
        <p className="font-bold text-gray-500 dark:text-gray-400">ยังไม่มีกิจกรรม</p>
        <p className="text-xs px-10 mt-2 text-gray-300 dark:text-gray-500 leading-relaxed">
          ในขณะนี้ยังไม่มีกำหนดการใดๆ ในระบบ
        </p>
      </div>
    );
  }

  // จำกัดแสดงผล 5 รายการ (หรือทั้งหมดตาม State / Props)
  const displayedEvents = (compactMode || !showAllEvents) ? events.slice(0, 5) : events;

  return (
    <div className="space-y-4">
      {displayedEvents.map((event) => {
        const startInfo = parseDateInfo(event.start);
        const endInfo = event.end ? parseDateInfo(event.end) : null;
        const isMultiDay = endInfo && event.start !== event.end;
        
        const dayColorClasses = startInfo ? getDayColorClasses(startInfo.dayOfWeek) : getDayColorClasses(-1);

        return (
          <div 
            key={event.id} 
            className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 transition-colors hover:shadow-md cursor-pointer group"
          >
            <div className={`${dayColorClasses} rounded-2xl w-16 h-16 flex flex-col items-center justify-center shrink-0 border group-hover:scale-105 transition-transform`}>
              <span className="text-xl font-black leading-none">{startInfo?.day || "-"}</span>
              <span className="text-[10px] font-bold mt-0.5">{startInfo?.monthShort || "-"}</span>
            </div>

            <div className="flex-1 min-w-0 py-0.5">
              <h3 className="font-bold text-gray-800 dark:text-white text-base truncate mb-1">
                {event.title || "ไม่มีชื่อกิจกรรม"}
              </h3>
              
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="truncate">
                    {isMultiDay 
                      ? `${startInfo?.day} ${startInfo?.monthShort} - ${endInfo?.day} ${endInfo?.monthShort} ${endInfo?.year}`
                      : event.allDay ? "ตลอดวัน" : `${startInfo?.time} น.`}
                  </span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{event.location}</span>
                  </div>
                )}
              </div>

              {event.description && (
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {/* ปุ่มดูทั้งหมด (ซ่อนถ้าอยู่ใน Compact Mode เช่น หน้าแรก หรือถ้ามีรายการไม่เกิน 5) */}
      {!compactMode && events.length > 5 && (
        <div className="pt-2 pb-6">
          <button
            onClick={() => setShowAllEvents(!showAllEvents)}
            className="w-full py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {showAllEvents ? (
              <>ย่อรายการลง <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg></>
            ) : (
              <>ดูทั้งหมด ({events.length} รายการ) <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}