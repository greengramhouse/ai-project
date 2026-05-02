import { cacheLife, cacheTag } from 'next/cache';
import { getFirestore } from 'firebase-admin/firestore';
import { customInitApp } from './firebase-admin-config';

export async function getPublicNews() {
  'use cache'; // เปิดใช้งาน Cache Component
  cacheLife('hours');
  cacheTag('news'); // ติด Tag ไว้เผื่อแอดมินสั่งล้างแคชตอนเพิ่มข่าวใหม่

  try {
    customInitApp();
    const db = getFirestore();

    // ดึงข้อมูลจาก collection "news"
    const snapshot = await db.collection('news').get();

    let fetchedNews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // เรียงลำดับข่าวล่าสุดขึ้นก่อน
    fetchedNews.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return fetchedNews;
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}