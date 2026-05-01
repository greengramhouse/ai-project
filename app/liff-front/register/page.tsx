"use client";

import { useEffect, useState } from "react";
import liff from "@line/liff";
import { useRouter } from "next/navigation";

export default function RegisterTeacherPage() {
  const [profile, setProfile] = useState<any>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (liff.isLoggedIn()) {
      liff.getProfile().then(setProfile);
    } else {
      liff.login();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/line/register', {
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 max-w-md mx-auto shadow-2xl">
        <div className="w-10 h-10 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm">กำลังเตรียมหน้าลงทะเบียน...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-10 max-w-md mx-auto shadow-2xl relative overflow-hidden">
      
      {/* 1. App Header (Sticky) แบบเดียวกับหน้า Home */}
      <header className="bg-white px-5 pt-8 pb-4 sticky top-0 z-40 shadow-sm flex items-center gap-3">
        <button 
          onClick={() => router.push('/liff-front')}
          className="p-2 -ml-2 text-gray-800 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-extrabold text-gray-800">
          ลงทะเบียนประวัติ
        </h1>
      </header>

      <main className="px-5 pt-6">
        
        {/* 2. Card พื้นที่ฟอร์ม (สไตล์เดียวกับ Widget หน้า Home) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          
          {/* ข้อมูล LINE Profile */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-50">
            <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
              {profile.pictureUrl ? (
                <img src={profile.pictureUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#06C755] flex items-center justify-center text-white font-bold text-xl">
                  {profile.displayName[0]}
                </div>
              )}
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-semibold mb-0.5 uppercase tracking-wider">บัญชีผู้ใช้ LINE</p>
              <p className="font-bold text-gray-800">{profile.displayName}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* หัวข้อฟอร์ม */}
            <div>
              <h2 className="text-sm font-bold text-gray-800 mb-1">ข้อมูลส่วนตัวบุคลากร</h2>
              <p className="text-xs text-gray-500">กรุณาระบุชื่อ-นามสกุลจริงเพื่อใช้ในระบบ</p>
            </div>

            {/* ช่องกรอกชื่อ */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 ml-1">ชื่อจริง <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#06C755] focus:bg-white focus:ring-2 focus:ring-[#06C755]/20 transition-all"
                placeholder="เช่น สมชาย"
              />
            </div>

            {/* ช่องกรอกนามสกุล */}
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 ml-1">นามสกุล <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#06C755] focus:bg-white focus:ring-2 focus:ring-[#06C755]/20 transition-all"
                placeholder="เช่น ใจดี"
              />
            </div>

            {/* ปุ่ม Submit */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-95 flex justify-center items-center gap-2
                  ${isLoading 
                    ? "bg-gray-300 cursor-not-allowed" 
                    : "bg-[#06C755] hover:bg-[#05b34c] shadow-lg shadow-green-200"
                  }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                    กำลังบันทึกข้อมูล...
                  </>
                ) : (
                  "ยืนยันการลงทะเบียน"
                )}
              </button>
            </div>
            
          </form>
        </div>
      </main>
    </div>
  );
}