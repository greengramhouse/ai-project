"use client";

import { useEffect, useState } from "react";
// ⚠️ MOCK: สำหรับ Canvas ถ้าโปรเจกต์จริงไม่ต้องใช้บรรทัดนี้ ให้ใช้ import ด้านล่างแทน
import { useRouter } from "next/navigation";
import { useLiff } from "../layout";

export default function ProfilePage() {
  const { profile, isReady, theme, toggleTheme } = useLiff();
  const router = useRouter();
  
  // จำลอง State สำหรับเก็บชื่อจริง-นามสกุล ที่ดึงมาจากฐานข้อมูล (เช่น Firebase)
  const [userData, setUserData] = useState<{ firstName: string; lastName: string; role: string } | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    // 🛠️ จำลองการดึงข้อมูลจาก Database (API หรือ Firebase)
    const fetchUserData = async () => {
      if (!profile?.userId) return;
      
      setIsLoadingData(true);
      try {
        // ในโปรเจกต์จริง คุณอาจจะดึงผ่าน API หรือ Firestore เช่น:
        
        const response = await fetch(`/api/line/profile?userId=${profile.userId}`);
        if (response.ok) {
           const data = await response.json();
           setUserData({
             firstName: data.firstName || "",
             lastName: data.lastName || "",
             role: data.role || "ผู้ใช้งานระบบ"
           });
        } else {
           // กรณีไม่พบข้อมูล หรือดึงไม่ได้ ให้ตกมาโชว์แค่ชื่อ LINE Display Name ก็ได้ครับ
           console.log("Profile API error", await response.text());
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setIsLoadingData(false);
      }
    };

    if (isReady && profile) {
      fetchUserData();
    }
  }, [isReady, profile]);

  const handleGoBack = () => {
    window.history.back();
  };

  const handleLogout = () => {
    // โลจิก Logout (ถ้ามี) หรือปิด LIFF
    alert("กำลังออกจากระบบ...");
    // liff.logout();
    // window.location.reload();
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center transition-colors">
        <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">กำลังเตรียมข้อมูลโปรไฟล์...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark bg-gray-900' : 'bg-gray-50'} pb-24 max-w-md mx-auto shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300`}>
      
      {/* 1. Header (โปร่งใสซ้อนทับภาพ Cover) */}
      <header className="absolute top-0 w-full px-5 pt-10 pb-4 z-40 flex items-center justify-between">
        <button 
          onClick={handleGoBack}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full transition-colors active:scale-95 flex items-center justify-center shadow-sm"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button 
          onClick={toggleTheme}
          className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full flex items-center justify-center text-lg transition-all active:scale-95 shadow-sm"
          aria-label="Toggle Dark Mode"
        >
          {theme === 'dark' ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="flex-1 flex flex-col">
        {/* 2. Cover Photo & Profile Avatar */}
        <div className="relative h-64 md:h-72 w-full bg-linear-to-br from-[#06C755] to-teal-700">
          {/* ลวดลายตกแต่ง (Pattern) */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]"></div>
          
          {/* ข้อมูลที่อยู่ด้านบน Cover */}
          <div className="absolute bottom-0 left-0 w-full translate-y-1/2 px-8 flex flex-col items-center">
            <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-white dark:border-gray-800 bg-white dark:bg-gray-800 shadow-xl z-10">
              {profile?.pictureUrl ? (
                <img 
                  src={profile.pictureUrl} 
                  alt="Profile" 
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-4xl text-gray-400">
                  <i className="fas fa-user"></i>
                </div>
              )}
              {/* Badge สถานะ */}
              <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* 3. ข้อมูลส่วนตัว (Profile Info) */}
        <div className="pt-20 px-6 pb-6 text-center space-y-1">
          {isLoadingData ? (
            <div className="space-y-2 flex flex-col items-center">
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"></div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white">
                {userData ? `${userData.firstName} ${userData.lastName}` : profile?.displayName}
              </h1>
              <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium">
                {userData?.role || "ผู้ใช้งานระบบ"}
              </p>
            </>
          )}
          
          {/* LINE Display Name (เล็กๆ) */}
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-[#06C755]/10 dark:bg-[#06C755]/20 text-[#06C755] dark:text-[#06C755] rounded-full text-[10px] font-bold">
            <i className="fab fa-line text-sm"></i>
            {profile?.displayName}
          </div>
        </div>

        {/* 4. เมนูจัดการบัญชี (Settings Menu) */}
        <div className="px-5 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-2 transition-colors">
            
            <button 
              onClick={() => router.push('/liff-front/register')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center text-lg">
                  <i className="fas fa-user-edit"></i>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">แก้ไขข้อมูลส่วนตัว</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">อัปเดตชื่อ หรือนามสกุล</p>
                </div>
              </div>
              <i className="fas fa-chevron-right text-gray-300 dark:text-gray-600 group-hover:text-[#06C755] transition-colors"></i>
            </button>

            <div className="h-px bg-gray-50 dark:bg-gray-700/50 mx-4"></div>

            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-full flex items-center justify-center text-lg">
                  <i className="fas fa-bell"></i>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">การแจ้งเตือน</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">ตั้งค่าการรับข้อความจากระบบ</p>
                </div>
              </div>
              <i className="fas fa-chevron-right text-gray-300 dark:text-gray-600 group-hover:text-[#06C755] transition-colors"></i>
            </button>
            
            <div className="h-px bg-gray-50 dark:bg-gray-700/50 mx-4"></div>

            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-2xl transition-colors group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-full flex items-center justify-center text-lg">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">ความปลอดภัย</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">การเชื่อมต่อ LINE และข้อมูล</p>
                </div>
              </div>
              <i className="fas fa-chevron-right text-gray-300 dark:text-gray-600 group-hover:text-[#06C755] transition-colors"></i>
            </button>

          </div>

          {/* 5. ปุ่มออกจากระบบ (ถ้าต้องการมี) */}
          <button 
            onClick={handleLogout}
            className="w-full py-4 mt-4 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 rounded-2xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-red-100 dark:border-red-900/30"
          >
            <i className="fas fa-sign-out-alt"></i>
            ออกจากระบบ
          </button>
        </div>
      </main>

      {/* อย่าลืมใส่ <head> <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" /> </head> ในหน้าหลักของแอปด้วยนะครับ เพื่อให้ไอคอนแสดง */}
    </div>
  );
}