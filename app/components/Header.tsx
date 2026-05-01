import { useState, useEffect, useRef } from "react";
import { useLiff } from "../liff-front/layout";
import Link from "next/link";
import liff from "@line/liff";
// หากคุณใช้ Next.js ให้ import Link จาก "next/link" 
// หรือถ้าใช้ React Router ให้ import { Link } จาก "react-router-dom"
// และเปลี่ยน <a href="..."> เป็น <Link href="..."> หรือ <Link to="..."> ตามลำดับ

export default function Header() {
  // 1. สร้าง State และ Ref สำหรับควบคุม Dropdown
  const { profile, isReady, theme, toggleTheme } = useLiff();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 2. ปิด Dropdown เมื่อคลิกบริเวณอื่นของหน้าจอ
useEffect(() => {
    // 1. กำหนด Type ให้ event เป็น MouseEvent
    const handleClickOutside = (event: MouseEvent) => {
      // 2. ระบุ event.target as Node เพื่อให้ .contains() ยอมรับค่า
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🆕 ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    if (typeof window !== "undefined" && liff.isLoggedIn && liff.isLoggedIn()) {
      liff.logout();
      window.location.reload();
    } else {
      alert("ออกจากระบบเรียบร้อย");
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 px-5 md:px-10 lg:px-20 pt-8 pb-4 sticky top-0 z-40 shadow-sm flex justify-between items-center transition-colors">
      <div className="flex-1">
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-0.5">
          สวัสดีครับ/ค่ะ ☀️
        </p>
        {!isReady ? (
          <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
        ) : (
          <h1 className="text-xl md:text-2xl font-extrabold text-gray-800 dark:text-white truncate">
            {profile?.displayName || "คุณครู"}
          </h1>
        )}
      </div>

      {/* กลุ่มเมนูด้านขวา (เปลี่ยนธีม + โปรไฟล์และ Dropdown) */}
      <div className="flex items-center gap-3 md:gap-4">
        
        {/* ☀️/🌙 ปุ่มสลับธีม */}
        <button
          onClick={toggleTheme}
          className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center text-lg md:text-xl transition-all active:scale-95 shadow-sm"
          aria-label="Toggle Dark Mode"
        >
          {theme === "dark" ? "🌙" : "☀️"}
        </button>

        {/* 🟢 รูปโปรไฟล์ + Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          {/* ปุ่มรูปโปรไฟล์ (กดเพื่อเปิด/ปิด Dropdown) */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden border-2 border-[#06C755] p-0.5 shadow-sm transition-all active:scale-95 focus:outline-none"
            aria-label="User menu"
            aria-expanded={isDropdownOpen}
          >
            {profile?.pictureUrl ? (
              <img
                src={profile.pictureUrl}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#06C755] rounded-full flex items-center justify-center text-white font-bold text-lg">
                {profile?.displayName?.[0] || "U"}
              </div>
            )}
          </button>

          {/* 📋 เมนู Dropdown */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg py-2 border border-gray-100 dark:border-gray-700 z-50 animate-in fade-in slide-in-from-top-2">
              
              {/* เมนู Profile */}
              <Link
                href="/liff-front/profile"
                className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                onClick={() => setIsDropdownOpen(false)} // ปิด dropdown เมื่อกดลิงก์
              >
                <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                โปรไฟล์
              </Link>

              {/* เส้นคั่น */}
              <div className="h-px bg-gray-100 dark:bg-gray-700 my-1"></div>

              {/* เมนู Logout */}
              <button
                onClick={() => {
                  setIsDropdownOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center px-4 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
              >
                <svg className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}