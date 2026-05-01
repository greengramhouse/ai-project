"use client";

import { useEffect, useState } from "react";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import useSWR from "swr"; 

import { useLiff } from "../layout";


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
// สามารถเพิ่ม userId ของ Admin คนอื่นๆ ต่อท้ายใน Array นี้ได้เลยครับ
const ADMIN_USER_IDS = [
  process.env.NEXT_PUBLIC_ADMIN_UID, // รหัสที่คุณระบุ
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

// ฟังก์ชันตัวช่วยดึงข้อความและสีตาม Status
const getStatusDisplay = (status: string) => {
  const map: Record<string, { text: string, bg: string, textCol: string, dot: string }> = {
    "RECEIVED": { text: "รับฝากเอกสารแล้ว", bg: "bg-amber-50", textCol: "text-amber-600", dot: "bg-amber-400 border-amber-200" },
    "AT_DIRECTOR": { text: "อยู่ที่ ผอ.แล้ว", bg: "bg-blue-50", textCol: "text-blue-600", dot: "bg-blue-400 border-blue-200" },
    "SIGNED": { text: "ลงนามเรียบร้อย", bg: "bg-emerald-50", textCol: "text-emerald-600", dot: "bg-emerald-400 border-emerald-200" },
    "RETURNED": { text: "รับคืนเอกสารแล้ว", bg: "bg-gray-100", textCol: "text-gray-600", dot: "bg-gray-400 border-gray-200" }
  };
  return map[status] || { text: status, bg: "bg-gray-100", textCol: "text-gray-600", dot: "bg-gray-400 border-gray-200" };
};

export default function DocumentPage() {
  const { profile: liffProfile } = useLiff();
  
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // 🆕 State ควบคุมการแสดงผลโหมด Admin
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // ตรวจสอบว่าผู้ใช้คนนี้เป็น Admin หรือไม่
  const isCurrentUserAdmin = liffProfile && ADMIN_USER_IDS.includes(liffProfile.userId);

  // Firebase Auth Init
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

  // Fetch Firestore Data (รองรับ Admin Mode)
  const fetchDocuments = async (currentUserId: string, viewAll: boolean): Promise<DocumentData[]> => {
    if (!db) return [];

    const docsRef = collection(db, 'artifacts', appId, 'public', 'data', 'documents');
    const snapshot = await getDocs(docsRef);
    
    let fetchedDocs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as DocumentData[]; 
    
    // ถ้าไม่ได้เปิด Admin Mode ให้กรองเฉพาะเอกสารของตัวเอง
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

  // ใช้ useSWR จัดการสถานะ โดยส่ง parameter ไปทาง Key Array
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
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium">กำลังเตรียมข้อมูลเอกสาร...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10 max-w-md mx-auto shadow-2xl relative overflow-hidden flex flex-col">
      {/* App Header */}
      <header className="bg-white px-5 pt-10 pb-4 sticky top-0 z-40 shadow-sm flex items-center gap-3">
        <button 
          onClick={handleGoBack}
          className="p-2 -ml-2 text-gray-800 hover:bg-gray-100 rounded-full transition-colors active:scale-95 flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-gray-800 leading-tight">
            เอกสารในระบบ
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            {isAdminMode ? "แสดงเอกสารทั้งหมดในระบบ" : `ไฟล์และเอกสารของ ${liffProfile.displayName}`}
          </p>
        </div>
      </header>

      {/* 🆕 Toggle Admin Mode (แสดงเฉพาะเมื่อ userId อยู่ใน ADMIN_USER_IDS) */}
      {isCurrentUserAdmin && (
        <div className="px-5 pt-5 pb-1">
          <div className="bg-green-50 border border-green-200/60 rounded-2xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-green-800 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                โหมดผู้ดูแลระบบ
              </span>
              <span className="text-[10px] text-green-600 mt-0.5">เปิดเพื่อดูเอกสารของทุกคนในระบบ</span>
            </div>
            
            {/* Toggle Button */}
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 ease-in-out focus:outline-none ${isAdminMode ? 'bg-[#06C755]' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-300 ease-in-out ${isAdminMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      )}

      <main className="px-5 pt-4 flex-1 flex flex-col">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {error ? (
            <div className="text-center py-16 text-rose-500 font-bold">
              เกิดข้อผิดพลาดในการดึงข้อมูล
            </div>
          ) : docsLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
              <p className="text-sm text-gray-400 font-medium tracking-wide">กำลังดึงข้อมูลเอกสาร...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">📁</div>
              <p className="font-bold text-gray-500">ไม่พบเอกสาร</p>
              <p className="text-xs px-10 mt-2 text-gray-300 leading-relaxed">
                {isAdminMode ? "ไม่มีเอกสารในระบบเลย" : "คุณยังไม่มีการส่งเอกสารเข้าสู่ระบบ"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
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
                      className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-green-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="text-xs font-bold text-gray-300 w-5 text-center shrink-0">{idx + 1}</div>
                        <div className="truncate">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-bold text-[#06C755] tracking-widest uppercase">ID-{doc.id.substring(0, 8)}</p>
                            {isSigned && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-[8px] font-black rounded uppercase tracking-tighter shadow-sm">SIGNED</span>
                            )}
                          </div>
                          <h4 className="font-bold text-gray-800 text-sm truncate">
                            {doc.name || "ไม่มีชื่อเอกสาร"}
                          </h4>
                          {/* ถ้าเปิดโหมด Admin ให้โชว์ชื่อคนฝากตัวเล็กๆ ด้วย */}
                          {isAdminMode && (
                            <p className="text-[10px] text-gray-400 truncate mt-0.5"><span className="font-medium text-gray-500">โดย:</span> {doc.submitter || "-"}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#06C755]' : ''}`}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>

                    {/* Ribbon Details (Accordion) */}
                    <div 
                      className={`overflow-hidden transition-all duration-300 ease-in-out bg-gray-50/80 ${isExpanded ? 'max-h-[1000px] opacity-100 border-t border-gray-100' : 'max-h-0 opacity-0'}`}
                    >
                      <div className="p-5 space-y-5">
                        {/* ข้อมูลพื้นฐาน */}
                        <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">ผู้ส่งเอกสาร</p>
                            <p className="text-sm font-semibold text-gray-800 truncate">{doc.submitter || "-"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">ลงวันที่เอกสาร</p>
                            <p className="text-sm font-semibold text-gray-800">{formatThaiDate(doc.date)}</p>
                          </div>
                        </div>

                        {/* รายละเอียด */}
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">รายละเอียด / หมายเหตุ</p>
                          <div className="text-sm text-gray-600 leading-relaxed bg-white p-4 rounded-2xl border border-gray-100 shadow-sm min-h-[40px]">
                            {doc.details || doc.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                          </div>
                        </div>

                        {/* ประวัติสถานะเอกสาร (Timeline) */}
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">ประวัติสถานะ (Timeline)</p>
                          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="relative border-l-2 border-gray-100 ml-2 space-y-5 my-1">
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
                                      <span className="text-[10px] text-gray-400">{formatTimelineDate(event.timestamp)}</span>
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