"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; 
import { useLiff } from "../../layout";

// โครงสร้างข้อมูลข่าว
type NewsData = {
  id: string;
  title: string;
  date: string;
  tag: string;
  color: string;
  content?: string;
  images?: string[];
  createdAt?: string;
};

export default function NewsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { theme, toggleTheme } = useLiff();
  
  // 🌟 1. เพิ่ม State ตรวจสอบว่าหน้าเว็บโหลดเสร็จบนฝั่งผู้ใช้ (Client) หรือยัง
  const [isMounted, setIsMounted] = useState(false);
  const [news, setNews] = useState<NewsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // 🌟 2. สั่งให้ isMounted เป็น true เฉพาะตอนที่ผู้ใช้เปิดหน้าเว็บ
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // 🌟 3. ถ้ายังไม่ Mount (ตอน Vercel กำลัง Build) ให้ข้ามการดึงข้อมูลไปเลย
    if (!isMounted) return;

    const fetchNewsDetail = async () => {
      if (!params?.id) return;
      
      try {
        const docRef = doc(db, "news", params.id as string);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setNews({ id: docSnap.id, ...docSnap.data() } as NewsData);
        } else {
          setIsError(true);
        }
      } catch (error) {
        console.error("Error fetching news detail:", error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNewsDetail();
  }, [params?.id, isMounted]);

  const handleGoBack = () => {
    router.back();
  };

  // 🌟 4. ขณะที่ Vercel กำลัง Build หรือกำลังดึงข้อมูล จะโชว์หน้านี้แทน (ผ่านฉลุยแน่นอน)
  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center transition-colors">
        <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">กำลังโหลดเนื้อหาข่าว...</p>
      </div>
    );
  }

  // 5. สถานะไม่พบข้อมูล หรือ Error
  if (isError || !news) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center transition-colors max-w-md mx-auto">
        <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center text-4xl mb-4">📰</div>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">ไม่พบข่าวสารนี้</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">ข้อมูลอาจถูกลบไปแล้ว หรือรหัสอ้างอิงไม่ถูกต้อง</p>
        <button 
          onClick={handleGoBack}
          className="px-6 py-3 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-2xl shadow-lg transition-colors active:scale-95"
        >
          กลับสู่หน้าหลัก
        </button>
      </div>
    );
  }

  const colorClass = news.color || "bg-blue-500";

  // 6. แสดงผลข่าวแบบเต็ม (Detail Page)
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'} pb-24 max-w-md mx-auto shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300`}>
      
      {/* App Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-5 pt-10 pb-4 sticky top-0 z-40 shadow-sm flex items-center justify-between transition-colors">
        <button 
          onClick={handleGoBack}
          className="p-2 -ml-2 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-95 flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h1 className="text-base font-bold text-gray-800 dark:text-white truncate max-w-50">
          ข่าวประชาสัมพันธ์
        </h1>

        <button 
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-lg transition-all active:scale-95 shadow-sm"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto">
        <article className="bg-white dark:bg-gray-800 min-h-full pb-10 transition-colors">
          
          {/* ข้อมูล Header บทความ */}
          <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-700">
            <span className={`inline-block px-3 py-1 ${colorClass} bg-opacity-10 dark:bg-opacity-20 text-white dark:text-opacity-90 text-xs font-bold rounded-lg mb-4`}>
              {news.tag || "ข่าวสาร"}
            </span>
            
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white leading-snug mb-4">
              {news.title}
            </h1>
            
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {news.date}
            </div>
          </div>

          {/* เนื้อหาบทความ */}
          <div className="p-6 md:p-8">
            
            {/* แสดงรูปภาพประกอบ */}
            {news.images && news.images.length > 0 && (
              <div className="grid gap-4 mb-8">
                {news.images.map((url, idx) => (
                  url.trim() && (
                    <div key={idx} className="rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-700 border border-gray-100 dark:border-gray-700 shadow-sm">
                      <img 
                        src={url} 
                        alt={`ภาพประกอบ ${idx + 1}`} 
                        className="w-full h-auto object-cover max-h-100"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    </div>
                  )
                ))}
              </div>
            )}

            {/* แสดง HTML จาก React-Quill */}
            {news.content ? (
              <div 
                className="quill-content text-gray-700 dark:text-gray-300 leading-relaxed text-[15px] md:text-base wrap-break-word"
                dangerouslySetInnerHTML={{ __html: news.content }} 
              />
            ) : (
              <p className="text-gray-400 italic">ไม่มีรายละเอียดเนื้อหา</p>
            )}

          </div>
        </article>
      </main>

      {/* สไตล์สำหรับจัดการ HTML ที่ได้มาจาก React-Quill */}
      <style dangerouslySetInnerHTML={{__html: `
        .quill-content h1 { font-size: 1.75rem; font-weight: 800; margin-top: 1.5rem; margin-bottom: 1rem; color: inherit; line-height: 1.3; }
        .quill-content h2 { font-size: 1.5rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.75rem; color: inherit; line-height: 1.3; }
        .quill-content h3 { font-size: 1.25rem; font-weight: 600; margin-top: 1.25rem; margin-bottom: 0.5rem; color: inherit; line-height: 1.4; }
        .quill-content p { margin-bottom: 1rem; }
        .quill-content ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 1rem; }
        .quill-content ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 1rem; }
        .quill-content li { margin-bottom: 0.25rem; }
        .quill-content a { color: #3b82f6; text-decoration: underline; }
        .quill-content strong { font-weight: 700; color: inherit; }
        .quill-content em { font-style: italic; }
        .quill-content u { text-decoration: underline; }
        .quill-content blockquote { border-left: 4px solid #e5e7eb; padding-left: 1rem; font-style: italic; color: #6b7280; margin: 1rem 0; }
        .dark .quill-content blockquote { border-left-color: #4b5563; color: #9ca3af; }
        .quill-content img { border-radius: 0.75rem; max-width: 100%; height: auto; margin: 1.5rem 0; }
      `}} />

    </div>
  );
}