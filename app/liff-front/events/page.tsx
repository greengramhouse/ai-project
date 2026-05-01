"use client";
import EventList from "@/app/components/Event";
import { useLiff } from "../layout";

export default function EventsPage() {
  const { profile: liffProfile, theme, toggleTheme, isReady } = useLiff();

  const handleGoBack = () => {
    window.history.back();
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center transition-colors">
        <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">กำลังเตรียมข้อมูลกิจกรรม...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'} pb-10 max-w-md mx-auto shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300`}>
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
              กิจกรรมโรงเรียน
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              ปฏิทินและตารางงานทั้งหมด
            </p>
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

      <main className="px-5 pt-6 flex-1 flex flex-col">
        {/* เรียกใช้ Component กิจกรรมแบบเต็ม (มีปุ่มดูทั้งหมด) */}
        <EventList />
      </main>
    </div>
  );
}