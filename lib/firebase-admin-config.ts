import { initializeApp, getApps, cert } from 'firebase-admin/app';

export function customInitApp() {
  // เช็คก่อนว่าเคย Initialize App ไปแล้วหรือยัง (ป้องกันการ Error กรณี Server รีสตาร์ท)
  if (getApps().length <= 0) {
    const serviceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // การอ่าน private key จาก .env มักจะมีปัญหาเรื่องบรรทัดใหม่ (\n) จึงต้องใช้ replace ช่วย
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    initializeApp({
      credential: cert(serviceAccount),
    });
  }
}