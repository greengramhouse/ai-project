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
      // เรียก API เพื่ออัปเดตข้อมูลลงฐานข้อมูล
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
        router.push('/liff-front'); // บันทึกเสร็จให้เด้งกลับไปหน้าหลัก
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
    return <div className="flex h-screen items-center justify-center p-4">กำลังเตรียมหน้าลงทะเบียน...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="bg-white p-6 rounded-2xl shadow-md max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-2 text-blue-600 text-center">ลงทะเบียนคุณครู</h1>
        <p className="text-gray-500 text-sm text-center mb-6">กรุณากรอกชื่อและนามสกุลเพื่อใช้งานระบบ</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อจริง</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="เช่น สมชาย"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="เช่น ใจดี"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-xl font-medium text-white transition-colors mt-4 
              ${isLoading ? "bg-gray-400" : "bg-blue-500 hover:bg-blue-600"}`}
          >
            {isLoading ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
          </button>

          <button
            type="button"
            onClick={() => router.push('/liff-front')}
            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors mt-2"
          >
            กลับหน้าหลัก
          </button>
        </form>
      </div>
    </div>
  );
}