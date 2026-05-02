'use server';

import { revalidateTag } from 'next/cache';

/**
 * ฟังก์ชัน Server Action สำหรับสั่งล้างแคชข่าวสาร
 * สาเหตุที่ต้องทำเป็น Server Action เพราะ revalidateTag ไม่สามารถรันบน Client ได้
 */
export async function triggerNewsRevalidation() {
  try {
    // 📌 สั่งล้างแคชที่ติด Tag ว่า 'news'
    // หากขึ้นหยักแดงใน VS Code แต่รันได้ปกติ แสดงว่าเป็นปัญหาที่ Type Definition ของ Next.js Canary
    // @ts-ignore แปะไว้ข้างบนเพื่อปิดคำเตือนได้ครับ
    revalidateTag('news');
    return { success: true };
  } catch (error) {
    console.error('Failed to revalidate news cache:', error);
    return { success: false };
  }
}