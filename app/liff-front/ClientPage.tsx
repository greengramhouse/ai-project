"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useLiff } from "./layout";

import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
  User,
} from "firebase/auth";

import NewsList from "../components/NewList";
import Header from "../components/Header";
import EventListCach from "../components/EventListCach";

let app: any,
  auth: any,
  appId = "default-app-id";

if (typeof window !== "undefined") {
  try {
    const firebaseConfig =
      typeof (window as any).__firebase_config !== "undefined"
        ? JSON.parse((window as any).__firebase_config)
        : {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          };

    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase init error:", error);
  }
}

const mockGallery = [
  { id: 1, url: "https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=800&auto=format&fit=crop", title: "กีฬาสี 68" },
  { id: 2, url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop", title: "เข้าค่าย" },
  { id: 3, url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop", title: "ประชุม" },
  { id: 4, url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop", title: "รับรางวัล" },
];

// 📌 รับข้อมูล events ที่ดึงเสร็จแล้วจาก Server (page.tsx) ผ่าน Props
export default function ClientPage({ initialEvents, initialNews }: { initialEvents: any[], initialNews: any[] }) {
  const { profile, isReady } = useLiff();
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();
  const [fbUser, setFbUser] = useState<User | null>(null);

  useEffect(() => {
    if (isReady) {
      const ADMIN_USER_IDS = [process.env.NEXT_PUBLIC_ADMIN_UID].filter(Boolean);
      const isAdmin = profile?.userId && ADMIN_USER_IDS.includes(profile.userId);
      setIsCheckingAuth(!!isAdmin);
    }
  }, [isReady, profile, router]);

  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        const globalToken = (window as any).__initial_auth_token;
        if (typeof globalToken !== "undefined" && globalToken) {
          await signInWithCustomToken(auth, globalToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Authentication Error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => {
    liff.login();
  };

  if (isReady && !profile) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex flex-col items-center justify-center p-6 w-full mx-auto transition-colors">
        <div className="w-32 h-32 bg-[#06C755]/10 rounded-full flex items-center justify-center mb-8">
          <img
            src="https://res.cloudinary.com/djkbdwnsc/image/upload/v1776877133/waroon/Logo-thaingam_i3poqc.png"
            alt="logo"
            className="w-20 h-20 object-contain"
          />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">ไทยงามธุรการ</h1>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10 text-sm">
          ระบบจัดการข้อมูลภายในโรงเรียน<br />กรุณาเข้าสู่ระบบเพื่อใช้งาน
        </p>
        <button
          onClick={handleLogin}
          className="w-full max-w-sm py-4 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200 transition-all active:scale-95"
        >
          เข้าสู่ระบบด้วย LINE
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24 w-full mx-auto relative transition-colors duration-300">
      <Header />

      <main className="px-5 md:px-10 lg:px-20 pt-6 space-y-8 md:space-y-12 max-w-7xl mx-auto">
        <section>
          <div className="grid grid-cols-4 gap-4 md:gap-8">
            <Link href="/liff-front/register" className="flex flex-col items-center group cursor-pointer">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-blue-100 text-blue-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl mb-2 group-hover:-translate-y-1 group-active:scale-95 transition-all shadow-sm">📝</div>
              <span className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">ลงทะเบียน</span>
            </Link>
            <Link href="/liff-front/student-table" className="flex flex-col items-center group">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-purple-100 text-purple-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl mb-2 group-hover:-translate-y-1 group-active:scale-95 transition-all shadow-sm">📋</div>
              <span className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">รายชื่อนักเรียน</span>
            </Link>
            <Link href="/liff-front/doccheck" className="flex flex-col items-center group">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-orange-100 text-orange-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl mb-2 group-hover:-translate-y-1 group-active:scale-95 transition-all shadow-sm">📄</div>
              <span className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">เอกสาร</span>
            </Link>
            <Link href="/" className="flex flex-col items-center group">
              <div className="w-14 h-14 md:w-20 md:h-20 bg-emerald-100 text-emerald-600 rounded-2xl md:rounded-3xl flex items-center justify-center text-2xl md:text-3xl mb-2 group-hover:-translate-y-1 group-active:scale-95 transition-all shadow-sm">⚙️</div>
              <span className="text-[11px] md:text-sm text-gray-600 dark:text-gray-300 font-medium text-center">คุยกับธุรการ</span>
            </Link>
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">ข่าวประชาสัมพันธ์ 📢</h2>
            {isCheckingAuth ? (
              <button onClick={() => router.push("/liff-front/createnews")} className="text-xs md:text-sm text-[#06C755] font-semibold hover:underline">
                + เพิ่มข่าวสาร(เฉพาะadmin)
              </button>
            ) : (
              <p className="text-xs">ไทยงาม News</p>
            )}
          </div>
          <NewsList initialNews={initialNews} />
        </section>

        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">ปฏิทินกิจกรรม 📅</h2>
            <button onClick={() => router.push("/liff-front/events")} className="text-xs md:text-sm text-[#06C755] font-semibold hover:underline">
              ดูทั้งหมด
            </button>
          </div>
          {/* 📌 เรียกใช้ Component แสดงผล โดยโยนข้อมูลดิบเข้าไปให้ */}
          <EventListCach events={initialEvents} compactMode={true} />
        </section>

        <section>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">ภาพกิจกรรม 📸</h2>
            <button className="text-xs md:text-sm text-[#06C755] font-semibold hover:underline">แกลลอรี่</button>
          </div>
          <div className="flex gap-3 md:gap-6 overflow-x-auto snap-x hide-scrollbar -mx-5 px-5 md:mx-0 md:px-0 pb-6">
            {mockGallery.map((img) => (
              <div key={img.id} onClick={() => setSelectedImage(img.url)} className="min-w-40 md:min-w-70 lg:min-w-[320px] h-32 md:h-48 lg:h-56 bg-gray-200 dark:bg-gray-700 rounded-2xl relative overflow-hidden group snap-start cursor-pointer shadow-sm shrink-0">
                <Image src={img.url} alt={img.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" width={400} height={300} />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-2 md:bottom-4 left-3 md:left-4 text-white text-xs md:text-base font-bold drop-shadow-md">{img.title}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {selectedImage && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 right-6 md:top-10 md:right-10 w-10 h-10 md:w-14 md:h-14 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-colors z-[60]" onClick={() => setSelectedImage(null)}>
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="relative w-full max-w-5xl h-[85vh] z-50" onClick={(e) => e.stopPropagation()}>
            <Image src={selectedImage} alt="Full screen view" fill className="rounded-lg object-contain shadow-2xl cursor-default" />
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@media (max-width: 768px) { .hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } }` }} />
    </div>
  );
}