"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import NewsList from "@/app/components/NewList";

// 📥 นำเข้า Component NewList ที่คุณแยกไว้
// หมายเหตุ: ชื่อไฟล์ของคุณใน components คือ NewList.tsx

// โครงสร้างข้อมูลข่าว (ให้ตรงกับที่คุณตั้งไว้ใน Component)
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

export default function NewsListPage() {
  const [newsData, setNewsData] = useState<NewsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🚀 ฟังก์ชันดึงข้อมูลข่าวทั้งหมดจาก Firebase
  useEffect(() => {
    const fetchAllNews = async () => {
      try {
        if (!db) return;
        
        // ดึงข้อมูลจากคอลเลกชัน "news"
        const q = query(collection(db, "news")); 
        const querySnapshot = await getDocs(q);
        
        const fetchedNews = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as NewsData[];

        // จัดเรียงข้อมูลจากใหม่ไปเก่า (ถ้ามีฟิลด์เวลา ถ้าไม่มีก็ไม่เป็นไรครับ)
        fetchedNews.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

        setNewsData(fetchedNews);
      } catch (error) {
        console.error("Error fetching all news:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllNews();
  }, []);

  // แสดงหน้าโหลดระหว่างรอข้อมูล
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center transition-colors">
        <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 font-medium dark:text-gray-400">กำลังโหลดรายการข่าว...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-10 pb-24 transition-colors">
      <div className="max-w-5xl mx-auto px-5 md:px-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white">
            ข่าวประชาสัมพันธ์ 📢
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base">
            อัปเดตข่าวสารและกิจกรรมล่าสุดจากทางเรา
          </p>
        </div>

        {/* 🌟 เรียกใช้ Component NewList และส่งข้อมูลข่าวเข้าไป */}
        <NewsList initialNews={newsData} />
      </div>
    </main>
  );
}