"use client";

import { useState, useEffect } from "react";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLiff } from "../liff-front/layout";
import { triggerNewsRevalidation } from "@/lib/news-action";
import Swal from "sweetalert2";

// นำเข้าฟอร์มแก้ไขและหน้าแสดงรายละเอียด
import EditNewsForm from "../liff-front/editnews/page";
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

  // 1. State สำหรับจัดการรายการข่าว
  const [newsList, setNewsList] = useState<NewsData[]>(initialNews);

  // 2. State สำหรับควบคุมการเปิดอ่านข่าว (Modal)
  const [viewingNews, setViewingNews] = useState<NewsData | null>(null);

  // 3. State สำหรับควบคุมการแก้ไขข่าว (Modal)
  const [editingNews, setEditingNews] = useState<NewsData | null>(null);

  useEffect(() => {
    setNewsList(initialNews);
  }, [initialNews]);

  const ADMIN_USER_IDS = [process.env.NEXT_PUBLIC_ADMIN_UID].filter(Boolean);
  const isAdmin = profile?.userId && ADMIN_USER_IDS.includes(profile.userId);

  // ฟังก์ชันลบข่าว
  const handleDelete = async (e: React.MouseEvent, news: NewsData) => {
    e.stopPropagation(); // กันไม่ให้ไปเปิดหน้าดูข่าวตอนกดลบ

    const result = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `คุณต้องการลบข่าว "${news.title}" ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "ยืนยันการลบ",
      cancelButtonText: "ยกเลิก",
      borderRadius: "1.5rem",
    });

    if (result.isConfirmed) {
      try {
        if (db) {
          await deleteDoc(doc(db, "news", news.id));
          await triggerNewsRevalidation();
        }
        
        setNewsList((prev) => prev.filter((item) => item.id !== news.id));
        
        Swal.fire({
          title: "ลบสำเร็จ!",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (error) {
        console.error("Delete error:", error);
        Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถลบข่าวสารได้", "error");
      }
    }
  };

  // ------------------------------------------------------------------
  // 🆕 เงื่อนไข: ถ้ากำลัง "ดูข่าว" ให้ผุดหน้า ShowNews ขึ้นมาทับ
  // ------------------------------------------------------------------
  if (viewingNews) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
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
  // 🆕 เงื่อนไข: ถ้ากำลัง "แก้ไขข่าว" ให้ผุดหน้า EditNewsForm ขึ้นมาทับ
  // ------------------------------------------------------------------
  if (editingNews) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
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
  // หน้า UI รายการข่าวปกติ (Horizontal Scroll)
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
            // ✅ คลิกการ์ดเพื่อ "ดูรายละเอียดข่าว"
            onClick={() => setViewingNews(news)}
            className="min-w-60 md:min-w-[320px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 shadow-sm snap-start relative overflow-hidden hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer shrink-0 group block"
          >
            {/* Background accent */}
            <div
              className={`absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 ${colorClass} opacity-10 dark:opacity-20 rounded-bl-full transition-transform duration-300 group-hover:scale-110`}
            />

            {/* Tag / Category */}
            <span
              className={`inline-block px-2.5 py-1 ${colorClass} bg-opacity-10 dark:bg-opacity-20 text-white dark:text-opacity-90 text-[10px] md:text-xs font-bold rounded-lg mb-3 md:mb-4`}
            >
              {news.tag || "ข่าวสาร"}
            </span>

            <h3 className="font-bold text-gray-800 dark:text-white text-sm md:text-base mb-1 line-clamp-2 pr-10">
              {news.title || "ไม่มีหัวข้อข่าว"}
            </h3>

            <p className="text-xs md:text-sm text-gray-400 dark:text-gray-500 mt-2">
              📅 {news.date || "-"}
            </p>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] font-bold text-blue-500 group-hover:translate-x-1 transition-transform">
                อ่านต่อ →
              </p>

              {/* ส่วนเครื่องมือ Admin */}
              {isAdmin && (
                <div className="flex items-center gap-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // กันไม่ให้ไปเปิดหน้าดูข่าว
                      setEditingNews(news);
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                    title="แก้ไขข่าว"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, news)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    title="ลบข่าว"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}