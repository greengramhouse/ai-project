"use client";

import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { useLiff } from "../liff-front/layout";

export type NewsData = {
  id: string;
  title: string;
  date: string;
  tag: string;
  color: string;
  content?: string;
  images?: string[];
  createdAt?: string;
};

export default function NewsList() {
  const { isReady, profile } = useLiff();
  const router = useRouter();

  const ADMIN_USER_IDS = [process.env.NEXT_PUBLIC_ADMIN_UID].filter(Boolean);
  const isAdmin = profile?.userId && ADMIN_USER_IDS.includes(profile.userId);

  const fetchNews = async (): Promise<NewsData[]> => {
    const newsRef = collection(db, "news");
    const snapshot = await getDocs(newsRef);

    let fetchedNews = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as NewsData[];

    fetchedNews.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );

    return fetchedNews;
  };

  const {
    data: newsList = [],
    error,
    isLoading,
    mutate: mutateNews,
  } = useSWR<NewsData[]>(isReady ? "public-news" : null, fetchNews, {
    revalidateOnFocus: false,
  });

  const handleDelete = async (
    e: React.MouseEvent,
    id: string,
    title: string,
  ) => {
    e.stopPropagation();
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบข่าว "${title}"?`)) return;

    if (!db) {
      alert(`ลบข่าวสาร "${title}" สำเร็จ (โหมดพรีวิว)`);
      return;
    }

    try {
      await deleteDoc(doc(db, "news", id));
      mutateNews();
    } catch (error) {
      console.error("Error deleting news:", error);
      alert("เกิดข้อผิดพลาดในการลบข่าวสาร");
    }
  };

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 text-center shadow-sm border border-gray-100 dark:border-gray-700">
        <p className="text-sm text-red-500 font-medium">
          ไม่สามารถโหลดข่าวสารได้
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 snap-x hide-scrollbar -mx-5 px-5 md:mx-0 md:px-0">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="min-w-60 md:min-w-[320px] bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm shrink-0 h-32 animate-pulse"
          >
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

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
            onClick={() => router.push(`/liff-front/newlist/${news.id}`)}
            className="min-w-60 md:min-w-[320px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-5 shadow-sm snap-start relative overflow-hidden 
            hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer shrink-0 group block"
          >
            {/* Background accent */}
            <div
              className={`absolute top-0 right-0 w-16 md:w-24 h-16 md:h-24 ${colorClass} opacity-10 dark:opacity-20 rounded-bl-full transition-transform duration-300 group-hover:scale-110`}
            />

            {/* Arrow hint */}
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

            {/* 👇 ข้อความบอกว่าคลิกได้ */}
            <p className="text-[11px] text-gray-400 mt-2 group-hover:text-blue-500 transition">
              คลิกเพื่ออ่านเพิ่มเติม →
            </p>

            {/* Admin tools */}
            {isAdmin && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/liff-front/editnew/${news.id}`);
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