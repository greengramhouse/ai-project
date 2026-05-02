import { cacheLife } from 'next/cache';
import { getFirestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { customInitApp } from './firebase-admin-config';

customInitApp();
const db = getFirestore();
const appId = process.env.NEXT_PUBLIC_APP_ID || 'calendar-app';

export async function getPublicEvents() {
  'use cache'; // เปิดใช้งาน Cache Component ระดับ Data
  cacheLife('hours'); // แคชไว้เป็นชั่วโมง (หรือเปลี่ยนเป็น 'minutes', 'days')

  try {
    const eventsRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('events');
    const snapshot = await eventsRef.get();
    
    let fetchedEvents = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // เรียงตามวันที่จัดกิจกรรม
    fetchedEvents.sort((a: any, b: any) => {
      const dateA = new Date(a.start || a.createdAt || 0).getTime();
      const dateB = new Date(b.start || b.createdAt || 0).getTime();
      return dateB - dateA; 
    });

    return fetchedEvents;
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
}