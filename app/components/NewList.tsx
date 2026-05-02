"use client";

import React, { useState, useEffect } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { triggerNewsRevalidation } from "@/lib/news-action";
import EditNewsForm from "../liff-front/editnews/page";
import { NewsData } from "../liff-front/newlist/page";

// ✅ นำเข้า ShowNews จากไฟล์แยก (แก้ไข Path ให้ตรงกับที่คุณเก็บไฟล์ ShowNews)
import ShowNews from "./ShowNews"; 

/** * Mock Swal สำหรับหน้า Preview / ถ้าใช้จริงสามารถ Import sweetalert2 ได้เลย
 */
const SwalMock = {
  fire: async (options: any) => {
    if (options.showCancelButton) {
      const confirmed = window.confirm(`${options.title}\n\n${options.text || ""}`);
      return { isConfirmed: confirmed };
    }
    window.alert(`${options.title}\n${options.text || ""}`);
    return { isConfirmed: true };
  }
};

// --- Main NewsList Component ---
export default function NewsList({ initialNews = [] }: { initialNews: NewsData[] }) {
  const [newsList, setNewsList] = useState<NewsData[]>(initialNews);
  const [viewingNews, setViewingNews] = useState<NewsData | null>(null);
  
  // State สำหรับเก็บข่าวที่ต้องการแก้ไข (ถ้ามีค่า = เปิด Modal)
  const [editingNews, setEditingNews] = useState<NewsData | null>(null);

  const isAdmin = true; 

  useEffect(() => {
    setNewsList(initialNews);
  }, [initialNews]);

  const handleDelete = async (e: React.MouseEvent, news: NewsData) => {
    e.stopPropagation();
    const result = await SwalMock.fire({
      title: "ยืนยันการลบ?",
      text: `คุณต้องการลบข่าว "${news.title}" ใช่หรือไม่?`,
      showCancelButton: true,
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

  // ------------------------------------
  // Render Modal: อ่านข่าว (เรียกใช้จาก Component แยก)
  // ------------------------------------
  if (viewingNews) {
    return (
      <div className="fixed inset-0 z-100 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm overflow-y-auto">
        <div className="max-w-4xl mx-auto py-10 px-5">
          <ShowNews news={viewingNews} onClose={() => setViewingNews(null)} />
        </div>
      </div>
    );
  }

  // ------------------------------------
  // Render Modal: เรียกใช้ EditNewsForm ที่แยกไฟล์มา
  // ------------------------------------
  if (editingNews) {
    return (
      <div className="fixed inset-0 z-100 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm overflow-y-auto">
        <div className="max-w-3xl mx-auto py-10 px-5">
          <EditNewsForm 
            initialData={editingNews} 
            onCancel={() => setEditingNews(null)} 
            onSuccess={(updatedNews) => {
              // อัปเดต List ข่าวหน้าบ้าน
              setNewsList(prev => prev.map(n => n.id === updatedNews.id ? updatedNews : n));
              // ปิด Modal
              setEditingNews(null);
            }} 
          />
        </div>
      </div>
    );
  }

  // ------------------------------------
  // Render: List รายการข่าว
  // ------------------------------------
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
          
          <div className="mt-4 flex justify-between items-center z-20 relative">
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