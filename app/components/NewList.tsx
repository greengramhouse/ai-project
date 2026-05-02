"use client";

import { useState, useEffect } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { triggerNewsRevalidation } from "@/lib/news-action";
// ⚠️ ในโปรเจกต์จริง ใช้ useLiff ของคุณเอง
import { useLiff } from "../liff-front/layout";
// นำเข้า Component EditNewsForm 
import EditNewsForm from "../liff-front/editnews/page";
// 🆕 นำเข้า Component ShowNews 
import ShowNews from "./ShowNews";

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

export default function NewsList({ initialNews = [] }: { initialNews: NewsData[] }) {
  const { profile } = useLiff();
  const router = useRouter();

  const [newsList, setNewsList] = useState<NewsData[]>(initialNews);
  const [editingNews, setEditingNews] = useState<NewsData | null>(null);
  // 🆕 State สำหรับการเปิดดูข่าว
  const [viewingNews, setViewingNews] = useState<NewsData | null>(null);

  useEffect(() => {
    setNewsList(initialNews);
  }, [initialNews]);

  const ADMIN_USER_IDS = [process.env.NEXT_PUBLIC_ADMIN_UID].filter(Boolean);
  const isAdmin = profile?.userId && ADMIN_USER_IDS.includes(profile.userId);

  const handleDelete = async (
    e: React.MouseEvent,
    id: string,
    title: string,
  ) => {
    e.stopPropagation();
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข่าว "${title}"?`)) return;

    if (!db) {
      alert(`ลบข่าวสาร "${title}" สำเร็จ (โหมดพรีวิว)`);
      setNewsList((prev) => prev.filter((news) => news.id !== id));
      return;
    }

    try {
      await deleteDoc(doc(db, "news", id));
      setNewsList((prev) => prev.filter((news) => news.id !== id));
      await triggerNewsRevalidation();
    } catch (error) {
      console.error("Error deleting news:", error);
      alert("เกิดข้อผิดพลาดในการลบข่าวสาร");
    }
  };

  // ------------------------------------------------------------------
  // 🆕 ถ้ามีการกดดูเนื้อหาข่าว ให้แสดง Modal เปิดอ่านข่าวสาร
  // ------------------------------------------------------------------
  if (viewingNews) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 overflow-y-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="min-h-screen py-10 px-5 transition-colors">
          <div className="max-w-4xl mx-auto">
            <ShowNews 
              news={viewingNews} 
              onClose={() => setViewingNews(null)} 
            />
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // ✅ เมื่อกดแก้ไข ครอบด้วย fixed inset-0 ให้เป็น Modal เต็มหน้าจอ ผุดขึ้นมา
  // ------------------------------------------------------------------
  if (editingNews) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 overflow-y-auto animate-in slide-in-from-bottom-4 fade-in duration-300">
        <div className="min-h-screen py-10 px-5 transition-colors">
          <div className="max-w-3xl mx-auto">
            <EditNewsForm
              initialData={editingNews}
              onCancel={() => setEditingNews(null)}
              onSuccess={(updatedNews) => {
                setNewsList((prev) =>
                  prev.map((n) => (n.id === updatedNews.id ? updatedNews : n))
                );
                setEditingNews(null);
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // หน้า UI รายการข่าวปกติ
  // ------------------------------------------------------------------
  if (newsList.length === 0) {
    return (
      <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
        <div className="text-4xl mb-3">📰</div>
        <p className="font-bold text-gray-500 dark:text-gray-400 text-sm">
          ยังไม่มีข่าวประชาสัมพันธ์
        </p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x hide-scrollbar -mx-5 px-5 md:mx-0 md:px-0">
      {newsList.map((news) => {
        const colorClass = news.color || "bg-blue-500";

        return (
          <div
            key={news.id}
            // 🆕 เปลี่ยนจาก router.push เป็น setViewingNews
            onClick={() => setViewingNews(news)}
            className="min-w-60 md:min-w-[320px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 shadow-sm snap-start relative overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer shrink-0 group block"
          >
            <div
              className={`absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 ${colorClass} opacity-10 dark:opacity-20 rounded-bl-full transition-transform duration-300 group-hover:scale-110`}
            />

            <div className="absolute top-3 right-3 text-gray-300 group-hover:text-blue-500 transition">
              →
            </div>

            <span
              className={`inline-block px-2.5 py-1 ${colorClass} bg-opacity-10 dark:bg-opacity-20 text-white dark:text-opacity-90 text-[10px] md:text-xs font-bold rounded-lg mb-3 md:mb-4`}
            >
              {news.tag || "ข่าวสาร"}
            </span>

            <h3 className="font-bold text-gray-800 dark:text-white text-sm md:text-base mb-1 line-clamp-2 pr-16">
              {news.title || "ไม่มีหัวข้อข่าว"}
            </h3>

            <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 mt-2">
              📅 {news.date || "-"}
            </p>

            <p className="text-[11px] text-gray-400 mt-2 group-hover:text-blue-500 transition">
              คลิกเพื่ออ่านเพิ่มเติม →
            </p>

            {isAdmin && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // ตั้งค่าข่าวที่จะแก้ไขเพื่อให้ฟอร์มผุดขึ้นมา
                    setEditingNews(news);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 text-blue-500 rounded-full shadow border border-gray-100 dark:border-gray-600 hover:bg-blue-50 dark:hover:bg-gray-600 transition-colors"
                  title="แก้ไขข่าว"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => handleDelete(e, news.id, news.title)}
                  className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 text-red-500 rounded-full shadow border border-gray-100 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-gray-600 transition-colors"
                  title="ลบข่าว"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}