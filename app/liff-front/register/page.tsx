"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLiff } from "../layout"; // 🆕 นำเข้า Context เพื่อดึง Profile และ Theme

export default function RegisterTeacherPage() {
  // 1. รับค่า Profile และ Theme โดยตรงจาก Layout (ไม่ต้องทำ liff.init ซ้ำแล้ว)
  const { profile, isReady, theme, toggleTheme } = useLiff();
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsLoading(true);

    try {
      // เรียก API เพื่ออัปเดตข้อมูลลงฐานข้อมูล
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lineUserId: profile.userId,
          firstName,
          lastName
        })
      });

      if (response.ok) {
        alert("ลงทะเบียนข้อมูลคุณครูสำเร็จ!");
        router.push('/liff-front'); 
      } else {
        alert("เกิดข้อผิดพลาดในการลงทะเบียน");
      }
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    window.history.back();
  };

  if (!isReady || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center transition-colors">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">กำลังเตรียมหน้าลงทะเบียน...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10 max-w-md mx-auto shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300">
      
      {/* App Header */}
      <header className="bg-white dark:bg-gray-800 px-5 pt-10 pb-4 sticky top-0 z-40 shadow-sm flex items-center justify-between transition-colors">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleGoBack}
            className="p-2 -ml-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-95 flex items-center justify-center"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 dark:text-white leading-tight">
              ลงทะเบียนระบบ
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">อัปเดตข้อมูลส่วนตัวคุณครู</p>
          </div>
        </div>

        {/* ☀️/🌙 ปุ่มสลับธีม */}
        <button 
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-lg transition-all active:scale-95 shadow-sm"
          aria-label="Toggle Dark Mode"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="flex-1 flex flex-col px-5 pt-8">
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-sm mx-auto">
            📝
          </div>
          <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-white text-center">ข้อมูลผู้ใช้งาน</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-8">
            ระบุชื่อ-นามสกุลจริง เพื่อให้ระบบบันทึกได้อย่างถูกต้อง
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">ชื่อจริง <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="เช่น สมชาย"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 ml-1">นามสกุล <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="เช่น ใจดี"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2
                  ${isLoading 
                    ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed shadow-none" 
                    : "bg-blue-600 hover:bg-blue-500 shadow-blue-200 dark:shadow-none"}`}
              >
                {isLoading ? (
                  <><i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...</>
                ) : (
                  "บันทึกข้อมูลเข้าระบบ"
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}