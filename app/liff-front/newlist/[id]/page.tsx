"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type NewsData = {
  id: string;
  title: string;
  date: string;
  tag: string;
  color: string;
  content?: string;
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
};

// 📌 เปลี่ยนมารับค่า params ผ่าน Props แทนการใช้ useParams() เพื่อแก้ปัญหา Build Error
export default function ShowNewsPage({ params }: { params: any }) {
  // รองรับการทำงานข้ามเวอร์ชัน (Next.js 14 ส่งมาเป็น Object ส่วน Next.js 15 ส่งมาเป็น Promise)
  // React.use() เป็น Hook ตัวเดียวที่อนุญาตให้เรียกใช้แบบมีเงื่อนไขได้
  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const id = resolvedParams?.id as string;
  
  const router = useRouter();

  const [news, setNews] = useState<NewsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      if (!id || !db) return;
      
      try {
        const docRef = doc(db, "news", id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setNews({ id: docSnap.id, ...docSnap.data() } as NewsData);
        } else {
          setError("ไม่พบข้อมูลข่าวสารนี้ หรืออาจถูกลบไปแล้ว");
        }
      } catch (err) {
        console.error("Error fetching news:", err);
        setError("เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง");
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 transition-colors">
        <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">กำลังโหลดเนื้อหาข่าว...</p>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 transition-colors text-center">
        <div className="text-5xl mb-4">😢</div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">อ๊ะ! มีบางอย่างผิดพลาด</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">{error}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-3 bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          กลับไปหน้าหลัก
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 md:py-10 px-4 md:px-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        {/* Header Navigation */}
        <div className="mb-6 md:mb-10">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Article Container */}
        <article className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {/* Article Header */}
          <div className="p-6 md:p-10 border-b border-gray-100 dark:border-gray-700 relative overflow-hidden">
            <div
              className={`absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 ${news.color || "bg-blue-500"} opacity-10 dark:opacity-20 rounded-bl-full`}
            />
            
            <div className="relative z-10">
              <span className={`inline-block px-3 py-1 md:px-4 md:py-1.5 ${news.color || "bg-blue-500"} bg-opacity-10 dark:bg-opacity-20 text-${news.color?.replace('bg-', 'text-') || 'blue-600'} dark:text-white text-xs md:text-sm font-bold rounded-lg mb-4 md:mb-6`}>
                {news.tag || "ข่าวสารทั่วไป"}
              </span>
              
              <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
                {news.title}
              </h1>
              
              <div className="flex items-center text-sm md:text-base text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {news.date}
                </span>
              </div>
            </div>
          </div>

          {/* Article Body */}
          <div className="p-6 md:p-10">
            {/* Gallery Section */}
            {news.images && news.images.length > 0 && (
              <div className="mb-8 md:mb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {news.images.map((url, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedImage(url)}
                      className="relative h-48 md:h-64 rounded-2xl overflow-hidden cursor-pointer group shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                      <img 
                        src={url} 
                        alt={`ภาพประกอบ ${idx + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main HTML Content */}
            <div 
              className="news-content text-gray-800 dark:text-gray-200 text-base md:text-lg leading-relaxed md:leading-loose"
              dangerouslySetInnerHTML={{ __html: news.content || "<p>ไม่มีรายละเอียดเพิ่มเติม</p>" }}
            />
          </div>
        </article>
      </div>

      {/* Image Modal (Lightbox) */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" 
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 md:top-10 md:right-10 w-10 h-10 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors z-[110]" 
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative w-full max-w-5xl h-[85vh] z-[100]" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="ภาพขยาย" 
              className="w-full h-full object-contain drop-shadow-2xl" 
            />
          </div>
        </div>
      )}

      {/* Styles สำหรับ HTML ที่มาจาก Quill Editor */}
      <style dangerouslySetInnerHTML={{ __html: `
        .news-content h1 { font-size: 1.8em; font-weight: 800; margin-top: 1.2em; margin-bottom: 0.6em; line-height: 1.3; }
        .news-content h2 { font-size: 1.5em; font-weight: 700; margin-top: 1.2em; margin-bottom: 0.6em; line-height: 1.3; }
        .news-content h3 { font-size: 1.25em; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; }
        .news-content p { margin-bottom: 1.2em; }
        .news-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.2em; }
        .news-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1.2em; }
        .news-content li { margin-bottom: 0.5em; }
        .news-content a { color: #06C755; text-decoration: underline; text-underline-offset: 4px; }
        .news-content a:hover { color: #05b34c; }
        .news-content blockquote { border-left: 4px solid #06C755; padding-left: 1em; margin-left: 0; margin-bottom: 1.2em; font-style: italic; color: #6b7280; }
        .news-content strong { font-weight: 700; color: inherit; }
        .dark .news-content blockquote { border-left-color: #06C755; color: #9ca3af; }
        .dark .news-content h1, .dark .news-content h2, .dark .news-content h3 { color: #f9fafb; }
        .dark .news-content strong { color: #f9fafb; }
      `}} />
    </div>
  );
}