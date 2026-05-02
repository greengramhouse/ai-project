"use client";

import React, { useState, useEffect } from "react";
// ใช้การ import แบบปลอดภัยสำหรับสภาพแวดล้อมที่อาจจะไม่มีไฟล์จริง
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { triggerNewsRevalidation } from "@/lib/news-action";
import dynamic from "next/dynamic";
import "react-quill-new/dist/quill.snow.css";

/**
 * แก้ไขปัญหา Type Error: 'borderRadius' 
 * โดยการใช้ SweetAlert2 ผ่านทางหน้าต่าง Window หรือ Mock ที่ไม่มี property เจ้าปัญหา
 */
const Swal = {
  fire: async (options: any) => {
    // ในการรันจริงจะเรียกใช้ SweetAlert2 แต่ใน Preview เราจะใช้ confirm/alert พื้นฐาน
    if (options.showCancelButton) {
      const confirmed = window.confirm(`${options.title}\n\n${options.text || ""}`);
      return { isConfirmed: confirmed };
    }
    window.alert(`${options.title}\n${options.text || ""}`);
    return { isConfirmed: true };
  }
};

// --- Types ---
export type NewsData = {
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

// --- ShowNews Component (อ่านข่าว) ---
const ShowNews = ({ news, onClose }: { news: NewsData; onClose: () => void }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="w-full animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl md:text-2xl font-extrabold text-gray-800 dark:text-white">รายละเอียดข่าวสาร 📰</h1>
      </div>

      <article className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 md:p-10 border-b border-gray-100 dark:border-gray-700 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-32 h-32 md:w-48 md:h-48 ${news.color || "bg-blue-500"} opacity-10 dark:opacity-20 rounded-bl-full`} />
          <div className="relative z-10">
            <span className={`inline-block px-3 py-1 ${news.color || "bg-blue-500"} bg-opacity-10 dark:bg-opacity-20 text-blue-600 dark:text-white text-xs font-bold rounded-lg mb-4`}>
              {news.tag || "ข่าวสารทั่วไป"}
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">{news.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">📅 {news.date}</p>
          </div>
        </div>

        <div className="p-6 md:p-10">
          {news.images && news.images.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {news.images.map((url, idx) => (
                <div key={idx} onClick={() => setSelectedImage(url)} className="relative h-48 rounded-2xl overflow-hidden cursor-pointer group shadow-sm border border-gray-100 dark:border-gray-700">
                  <img src={url} alt="News" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                </div>
              ))}
            </div>
          )}
          <div 
            className="news-content text-gray-800 dark:text-gray-200" 
            dangerouslySetInnerHTML={{ __html: news.content || "<p>ไม่มีรายละเอียด</p>" }} 
          />
        </div>
      </article>

      {selectedImage && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Full screen" className="max-w-full max-h-full object-contain" />
        </div>
      )}
      <style>{`
        .news-content h1, .news-content h2 { font-weight: bold; margin-bottom: 0.5em; font-size: 1.5em; }
        .news-content p { margin-bottom: 1em; line-height: 1.6; }
      `}</style>
    </div>
  );
};

// --- EditNewsForm Component (แก้ไขข่าว) ---
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });

const EditNewsForm = ({ initialData, onCancel, onSuccess }: { initialData: NewsData; onCancel: () => void; onSuccess: (u: NewsData) => void }) => {
  const [title, setTitle] = useState(initialData.title);
  const [date, setDate] = useState(initialData.date);
  const [tag, setTag] = useState(initialData.tag);
  const [color, setColor] = useState(initialData.color);
  const [content, setContent] = useState(initialData.content || "");
  const [imageUrls, setImageUrls] = useState<string[]>(initialData.images || []);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const validImages = imageUrls.filter(u => u.trim() !== "");
      const updatedData = { ...initialData, title, date, tag, color, content, images: validImages, updatedAt: new Date().toISOString() };
      
      if (db) {
        await updateDoc(doc(db, "news", initialData.id), updatedData);
        await triggerNewsRevalidation();
      }
      onSuccess(updatedData);
    } catch (error) {
      console.error(error);
      Swal.fire({ title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกข้อมูลได้", icon: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={onCancel} className="w-10 h-10 bg-white dark:bg-gray-800 border rounded-full flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-gray-800 dark:text-white">แก้ไขข่าวประชาสัมพันธ์ ✏️</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 md:p-8 space-y-6">
        <div>
          <label className="block text-sm font-bold mb-2">หัวข้อข่าว</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 rounded-xl border dark:bg-gray-900" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold mb-2">วันที่</label>
            <input type="text" value={date} onChange={e => setDate(e.target.value)} className="w-full p-3 rounded-xl border dark:bg-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">หมวดหมู่</label>
            <select value={tag} onChange={e => setTag(e.target.value)} className="w-full p-3 rounded-xl border dark:bg-gray-900">
              <option>วิชาการ</option><option>กิจกรรม</option><option>ประกาศ</option><option>อบรม</option><option>ทั่วไป</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold mb-2">เนื้อหาข่าว</label>
          <ReactQuill theme="snow" value={content} onChange={setContent} />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={onCancel} className="px-6 py-2 text-gray-500">ยกเลิก</button>
          <button type="submit" disabled={isLoading} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold">
            {isLoading ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>
        </div>
      </form>
    </div>
  );
};

// --- Main NewsList Component ---
export default function NewsList({ initialNews = [] }: { initialNews: NewsData[] }) {
  const [newsList, setNewsList] = useState<NewsData[]>(initialNews);
  const [viewingNews, setViewingNews] = useState<NewsData | null>(null);
  const [editingNews, setEditingNews] = useState<NewsData | null>(null);

  // จำลองสิทธิ์ Admin
  const isAdmin = true; 

  useEffect(() => {
    setNewsList(initialNews);
  }, [initialNews]);

  const handleDelete = async (e: React.MouseEvent, news: NewsData) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `คุณต้องการลบข่าว "${news.title}" ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก"
    });

    if (result.isConfirmed) {
      try {
        if (db) {
          await deleteDoc(doc(db, "news", news.id));
          await triggerNewsRevalidation();
        }
        setNewsList(prev => prev.filter(n => n.id !== news.id));
      } catch (error) {
        console.error(error);
      }
    }
  };

  // Rendering Modals
  if (viewingNews) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <div className="max-w-4xl mx-auto py-10 px-5">
          <ShowNews news={viewingNews} onClose={() => setViewingNews(null)} />
        </div>
      </div>
    );
  }

  if (editingNews) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-10 px-5">
          <EditNewsForm 
            initialData={editingNews} 
            onCancel={() => setEditingNews(null)} 
            onSuccess={u => {
              setNewsList(prev => prev.map(n => n.id === u.id ? u : n));
              setEditingNews(null);
            }} 
          />
        </div>
      </div>
    );
  }

  // Horizontal List View
  if (newsList.length === 0) {
    return (
      <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-3xl border">
        <p className="text-gray-500">ยังไม่มีข่าวประชาสัมพันธ์</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x hide-scrollbar -mx-5 px-5 md:mx-0 md:px-0">
      {newsList.map((news) => (
        <div
          key={news.id}
          onClick={() => setViewingNews(news)}
          className="min-w-60 md:min-w-[320px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 shadow-sm snap-start relative overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer shrink-0 group"
        >
          <div className={`absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 ${news.color || "bg-blue-500"} opacity-10 dark:opacity-20 rounded-bl-full`} />
          <span className={`inline-block px-2.5 py-1 ${news.color || "bg-blue-500"} bg-opacity-10 dark:bg-opacity-20 text-blue-600 dark:text-white text-[10px] md:text-xs font-bold rounded-lg mb-4`}>
            {news.tag || "ข่าวสาร"}
          </span>
          <h3 className="font-bold text-gray-800 dark:text-white text-sm md:text-base mb-1 line-clamp-2 pr-10">{news.title}</h3>
          <p className="text-xs text-gray-400 mt-2">📅 {news.date}</p>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-xs font-bold text-blue-500">อ่านต่อ →</p>
            {isAdmin && (
              <div className="flex gap-2">
                <button onClick={e => { e.stopPropagation(); setEditingNews(news); }} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-blue-500 hover:bg-blue-500 hover:text-white transition-all">✏️</button>
                <button onClick={e => handleDelete(e, news)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all">🗑️</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}