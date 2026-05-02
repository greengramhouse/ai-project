"use client";

import { useState } from "react";

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

type ShowNewsProps = {
  news: NewsData;
  onClose: () => void;
};

export default function ShowNews({ news, onClose }: ShowNewsProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-300">
      {/* ส่วนหัวสำหรับปิดหน้าจอ */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onClose}
          type="button"
          className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-800 dark:text-white">
            รายละเอียดข่าวสาร 📰
          </h1>
        </div>
      </div>

      {/* คอนเทนเนอร์เนื้อหาข่าว */}
      <article className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* ส่วนหัวข่าว (Header) */}
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

        {/* ส่วนเนื้อหา (Body) */}
        <div className="p-6 md:p-10">
          {/* ส่วนแสดงรูปภาพ Gallery */}
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

          {/* เนื้อหาข่าวที่บันทึกจาก Editor */}
          <div 
            className="news-content text-gray-800 dark:text-gray-200 text-base md:text-lg leading-relaxed md:leading-loose"
            dangerouslySetInnerHTML={{ __html: news.content || "<p>ไม่มีรายละเอียดเพิ่มเติม</p>" }}
          />
        </div>
      </article>

      {/* Modal สำหรับขยายรูปภาพ */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" 
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 md:top-10 md:right-10 w-10 h-10 md:w-14 md:h-14 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors z-[210]" 
            onClick={() => setSelectedImage(null)}
          >
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative w-full max-w-5xl h-[85vh] z-[200]" onClick={(e) => e.stopPropagation()}>
            <img 
              src={selectedImage} 
              alt="ภาพขยาย" 
              className="w-full h-full object-contain drop-shadow-2xl" 
            />
          </div>
        </div>
      )}

      {/* ปรับแต่ง CSS สำหรับ HTML Content */}
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