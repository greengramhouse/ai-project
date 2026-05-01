import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 max-w-md mx-auto shadow-2xl relative overflow-hidden">
      
      {/* ลายน้ำ 404 พื้นหลังขนาดใหญ่ */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[12rem] font-black text-gray-200/50 z-0 select-none">
        404
      </div>

      <div className="relative z-10 flex flex-col items-center text-center w-full">
        {/* ไอคอนแว่นขยาย (ค้นหาไม่เจอ) */}
        <div className="w-24 h-24 bg-white rounded-full shadow-sm flex items-center justify-center mb-6 text-[#06C755]">
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">ไม่พบหน้านี้</h1>
        <p className="text-gray-500 text-sm mb-10 leading-relaxed">
          ขออภัย เราไม่พบหน้าที่คุณกำลังค้นหา <br />
          ลิงก์อาจไม่ถูกต้อง หรือหน้านี้กำลังอยู่ระหว่างพัฒนา
        </p>

        {/* ปุ่มกลับหน้าหลัก */}
        <Link
          href="/liff-front"
          className="w-full py-4 bg-[#06C755] hover:bg-[#05b34c] text-white rounded-2xl font-bold text-lg shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          กลับสู่หน้าหลัก
        </Link>
      </div>
      
    </div>
  );
}