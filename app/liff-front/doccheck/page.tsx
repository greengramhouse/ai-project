"use client";

import { useEffect, useState } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import useSWR from "swr"; 

// ⚠️ หมายเหตุ: สำหรับการแสดงผลพรีวิวใน Canvas นี้ ผมได้ทำการจำลอง useLiff ขึ้นมาเพื่อให้โค้ดคอมไพล์ผ่าน
// ในโปรเจกต์ Next.js จริงของคุณ ให้ลบ mock ด้านล่างนี้ออก แล้วใช้คำสั่ง import ด้านล่างแทนนะครับ
import { useLiff } from "../layout";

// const useLiff = () => {
//   const [profile, setProfile] = useState<any>(null);
//   const [theme, setTheme] = useState('light');
//   useEffect(() => {
//     // จำลองข้อมูลให้ตรงกับในฐานข้อมูลที่คุณส่งภาพมา
//     const mockProfile = { userId: "Uc4fb8efc60cb7d73e5c4e20ac1d2d013", displayName: "วรุณพร" };
//     setProfile(mockProfile);
//   }, []);
//   const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
//   return { profile, theme, toggleTheme, isReady: true };
// };

// ==========================================
// 🔧 ตั้งค่า Firebase
// ==========================================
let app: any, auth: any, db: any, appId = 'calendar-app';

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
    
    if (typeof (window as any).__app_id !== 'undefined' && (window as any).__app_id) {
      appId = (window as any).__app_id;
    }
  } catch (error) {
    console.error("Firebase init error:", error);
  }
}

// 👑 กำหนดรายชื่อ LINE User ID สำหรับผู้ดูแลระบบ (Admin)
const ADMIN_USER_IDS = [
  "Uc4fb8efc60cb7d73e5c4e20ac1d2d013",
  "ใส่_USER_ID_ของ_ADMIN_คนต่อไปที่นี่"
];

type TimelineEvent = {
  status: string;
  timestamp: string;
  updatedBy?: string;
};

type DocumentData = {
  id: string;
  createdAt?: string;
  createdBy?: string;
  date?: string;
  details?: string;
  description?: string;
  docLineUserId?: string;
  name?: string;
  status?: string;
  submitter?: string;
  timeline?: TimelineEvent[];
  updatedAt?: string;
  updatedBy?: string;
  [key: string]: any; 
};

// ฟังก์ชันสำหรับจัดรูปแบบวันที่ภาษาไทย
const formatThaiDate = (dateString?: string) => {
  if (!dateString || dateString === "-") return "-";
  try {
    const [yearStr, monthStr, dayStr] = dateString.split('-');
    let year = parseInt(yearStr, 10);
    if (year < 2400) year += 543;
    const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const monthName = thaiMonths[parseInt(monthStr, 10) - 1];
    return `${parseInt(dayStr, 10)} ${monthName} ${year}`;
  } catch (e) {
    return dateString;
  }
};

// ฟังก์ชันสำหรับแปลงรูปแบบ Timeline
const formatTimelineDate = (isoString: string) => {
  const d = new Date(isoString);
  const datePart = d.toISOString().split('T')[0];
  const timePart = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  return `${formatThaiDate(datePart)} เวลา ${timePart} น.`;
};

// ฟังก์ชันตัวช่วยดึงข้อความและสีตาม Status (รองรับ Dark Mode)
const getStatusDisplay = (status: string) => {
  const map: Record<string, { text: string, bg: string, textCol: string, dot: string }> = {
    "RECEIVED": { text: "รับฝากเอกสารแล้ว", bg: "bg-amber-50 dark:bg-amber-900/20", textCol: "text-amber-600 dark:text-amber-400", dot: "bg-amber-400 border-amber-200 dark:border-amber-700/50" },
    "AT_DIRECTOR": { text: "อยู่ที่ ผอ.แล้ว", bg: "bg-blue-50 dark:bg-blue-900/20", textCol: "text-blue-600 dark:text-blue-400", dot: "bg-blue-400 border-blue-200 dark:border-blue-700/50" },
    "SIGNED": { text: "ลงนามเรียบร้อย", bg: "bg-emerald-50 dark:bg-emerald-900/20", textCol: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-400 border-emerald-200 dark:border-emerald-700/50" },
    "RETURNED": { text: "รับคืนเอกสารแล้ว", bg: "bg-gray-100 dark:bg-gray-800", textCol: "text-gray-600 dark:text-gray-400", dot: "bg-gray-400 border-gray-200 dark:border-gray-700/50" }
  };
  return map[status] || { text: status, bg: "bg-gray-100 dark:bg-gray-800", textCol: "text-gray-600 dark:text-gray-400", dot: "bg-gray-400 border-gray-200 dark:border-gray-700/50" };
};

export default function DocumentPage() {
  const { profile: liffProfile, theme, toggleTheme } = useLiff();
  
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const isCurrentUserAdmin = liffProfile && ADMIN_USER_IDS.includes(liffProfile.userId);

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

  const fetchDocuments = async (currentUserId: string, viewAll: boolean): Promise<DocumentData[]> => {
    if (!db) return [];

    const docsRef = collection(db, 'artifacts', appId, 'public', 'data', 'documents');
    const snapshot = await getDocs(docsRef);
    
    let fetchedDocs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DocumentData[]; 
    
    if (!viewAll) {
      fetchedDocs = fetchedDocs.filter(doc => 
        doc.docLineUserId === currentUserId || doc.createdBy === fbUser?.uid
      );
    }
    
    fetchedDocs.sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return fetchedDocs;
  };

  const { 
    data: documents = [], 
    error, 
    isLoading: docsLoading 
  } = useSWR<DocumentData[]>(
    (fbUser && liffProfile) ? ['documents', liffProfile.userId, isAdminMode] : null,
    ([, userId, adminMode]) => fetchDocuments(userId as string, adminMode as boolean),
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      keepPreviousData: true, 
    }
  );

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleGoBack = () => {
    window.history.back();
  };

  if (!liffProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center transition-colors">
        <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">กำลังเตรียมข้อมูลเอกสาร...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'} pb-10 max-w-md mx-auto shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300`}>
      {/* App Header */}
      <header className="bg-white dark:bg-gray-800 px-5 pt-10 pb-4 sticky top-0 z-40 shadow-sm flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleGoBack}
            className="p-2 -ml-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-95 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 dark:text-white leading-tight">
              เอกสารในระบบ
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {isAdminMode ? "แสดงเอกสารทั้งหมดในระบบ" : `ไฟล์และเอกสารของ ${liffProfile.displayName}`}
            </p>
          </div>
        </div>

        {/* ☀️/🌙 ปุ่มสลับธีม */}
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-lg transition-all active:scale-95 shadow-sm"
          aria-label="Toggle Dark Mode"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </header>

      {/* Toggle Admin Mode */}
      {isCurrentUserAdmin && (
        <div className="px-5 pt-5 pb-1">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200/60 dark:border-green-800/60 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-colors">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-green-800 dark:text-green-400 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-600 dark:text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                โหมดผู้ดูแลระบบ
              </span>
              <span className="text-[10px] text-green-600 dark:text-green-500 mt-0.5">เปิดเพื่อดูเอกสารของทุกคนในระบบ</span>
            </div>
            
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none ${isAdminMode ? 'bg-[#06C755]' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-300 ease-in-out ${isAdminMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      )}

      <main className="px-5 pt-4 flex-1 flex flex-col">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
          {error ? (
            <div className="text-center py-16 text-rose-500 font-bold">
              เกิดข้อผิดพลาดในการดึงข้อมูล
            </div>
          ) : docsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-gray-400 dark:text-gray-500 font-medium tracking-wide">กำลังดึงข้อมูลเอกสาร...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-20 text-gray-400 dark:text-gray-500">
              <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner transition-colors">📁</div>
              <p className="font-bold text-gray-500 dark:text-gray-400">ไม่พบเอกสาร</p>
              <p className="text-xs px-10 mt-2 text-gray-300 dark:text-gray-500 leading-relaxed">
                {isAdminMode ? "ไม่มีเอกสารในระบบเลย" : "คุณยังไม่มีการส่งเอกสารเข้าสู่ระบบ"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {documents.map((doc, idx) => {
                const isExpanded = expandedId === doc.id;

                const timelineEvents = (doc.timeline && doc.timeline.length > 0)
                  ? [...doc.timeline].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                  : [{ status: doc.status || "RECEIVED", timestamp: doc.createdAt || new Date().toISOString() }];

                const latestStatus = timelineEvents[timelineEvents.length - 1].status;
                const isSigned = latestStatus === 'SIGNED';
                
                return (
                  <div key={doc.id} className="transition-all duration-300">
                    {/* Header Row */}
                    <div 
                      onClick={() => toggleExpand(doc.id)}
                      className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-green-50/50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="text-xs font-bold text-gray-300 dark:text-gray-500 w-5 text-center shrink-0">{idx + 1}</div>
                        <div className="truncate">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-bold text-[#06C755] tracking-widest uppercase">ID-{doc.id.substring(0, 8)}</p>
                            {isSigned && (
                              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 text-[8px] font-black rounded uppercase tracking-tighter shadow-sm">SIGNED</span>
                            )}
                          </div>
                          <h4 className="font-bold text-gray-800 dark:text-white text-sm truncate">
                            {doc.name || "ไม่มีชื่อเอกสาร"}
                          </h4>
                          {isAdminMode && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5"><span className="font-medium text-gray-500 dark:text-gray-400">โดย:</span> {doc.submitter || "-"}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className={`text-gray-400 dark:text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#06C755]' : ''}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Ribbon Details (Accordion) */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out bg-gray-50/80 dark:bg-gray-900/50 ${isExpanded ? 'max-h-[1000px] opacity-100 border-t border-gray-100 dark:border-gray-700' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="p-5 space-y-5">
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-wider">ผู้ส่งเอกสาร</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{doc.submitter || "-"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-wider">ลงวันที่เอกสาร</p>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatThaiDate(doc.date)}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-wider">รายละเอียด / หมายเหตุ</p>
                          <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm min-h-[40px] transition-colors">
                            {doc.details || doc.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                          </div>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-wider">ประวัติสถานะ (Timeline)</p>
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-colors">
                            <div className="relative border-l-2 border-gray-100 dark:border-gray-700 ml-2 space-y-5 my-1">
                              {timelineEvents.map((event, idx) => {
                                const display = getStatusDisplay(event.status);
                                const isLast = idx === timelineEvents.length - 1;
                                
                                return (
                                  <div key={idx} className="relative pl-5">
                                    {/* จุด Timeline พร้อม Animation */}
                                    <div className="absolute -left-[9px] top-0.5 w-4 h-4">
                                      {isLast && (
                                        <div className={`absolute inset-0 rounded-full animate-ping opacity-60 ${display.dot.split(' ')[0]}`}></div>
                                      )}
                                      <div className={`relative w-full h-full rounded-full border-2 ${display.dot} ${isLast ? 'ring-4 ring-opacity-30 shadow-md scale-110' : ''}`}></div>
                                    </div>
                                    
                                    {/* เนื้อหา Timeline */}
                                    <div className="flex flex-col gap-0.5">
                                      <span className={`text-xs font-bold ${display.textCol}`}>{display.text}</span>
                                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatTimelineDate(event.timestamp)}</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}