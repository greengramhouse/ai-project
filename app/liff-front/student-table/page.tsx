"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import useSWR from 'swr';
import { formatThaiDate } from "@/lib/formatThaiDate";
import { useLiff } from "../layout"; // 🆕 นำเข้า Context เพื่อใช้งาน Theme

type Student = {
  no: string | number;
  citizen_id: string;
  student_id: string;
  prefix: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  remark: string;
  classroom: string;
};

const fetcher = (url: string) => fetch(url).then(res => res.json()).then(data => Array.isArray(data) ? data : data.data || []);

function StudentTableContent() {
  const { data: students, error } = useSWR<Student[]>(
    "https://script.google.com/macros/s/AKfycbwGKkKFJhysM4U02sUEd-v01wTCd7pBiHxFcTi7gPNCWybgT1xT6Md3e6bZyWry2eZx/exec?action=getStudents",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      suspense: true,
    }
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClass, setSelectedClass] = useState("ทั้งหมด");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const classrooms = useMemo(() => {
    if (!students) return ["ทั้งหมด"];
    const classes = new Set(students.map(s => s.classroom).filter(Boolean));
    return ["ทั้งหมด", ...Array.from(classes).sort()];
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    return students.filter(student => {
      const matchName = 
        student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_id?.toString().includes(searchTerm);
      
      const matchClass = selectedClass === "ทั้งหมด" || student.classroom === selectedClass;

      return matchName && matchClass;
    });
  }, [students, searchTerm, selectedClass]);

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentData = useMemo(() => {
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, startIndex]);

  useMemo(() => {
    setCurrentPage(1);
    setExpandedId(null);
  }, [searchTerm, selectedClass]);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-4 rounded-2xl text-sm text-center m-5 transition-colors">
        ไม่สามารถดึงข้อมูลนักเรียนได้ กรุณาลองใหม่อีกครั้ง
      </div>
    );
  }

  return (
    <>
      {/* 2. Search & Filter Section */}
      <div className="px-5 pt-6 pb-2 shrink-0 z-30">
        {/* 🎨 รองรับ Dark Mode (bg-gray-800, border-gray-700) */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <div className="space-y-4">
            {/* ช่องค้นหา */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl pl-11 pr-4 py-3 text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#06C755] focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-[#06C755]/20 transition-all"
                placeholder="ค้นหาชื่อ, นามสกุล, หรือรหัส..."
              />
            </div>

            {/* ตัวกรองห้องเรียน */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">ห้องเรียน :</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:outline-none focus:border-[#06C755] focus:ring-2 focus:ring-[#06C755]/20 appearance-none transition-colors"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
                  backgroundSize: "10px 10px",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center"
                }}
              >
                {classrooms.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Table / List Section */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 hide-scrollbar">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-16 text-gray-400 h-full flex flex-col justify-center">
            <svg className="w-16 h-16 mx-auto text-gray-200 dark:text-gray-700 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>ไม่พบข้อมูลที่ค้นหา</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-2 transition-colors">
            {currentData.map((student, index) => {
              const isExpanded = expandedId === student.student_id;
              
              return (
                <div key={student.student_id} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div 
                    onClick={() => toggleExpand(student.student_id)}
                    className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${isExpanded ? 'bg-green-50/50 dark:bg-green-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="text-xs font-bold text-gray-400 dark:text-gray-500 w-6 shrink-0 text-center">
                        {student.no || (startIndex + index + 1)}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-[#06C755] mb-0.5 tracking-wide">{student.student_id}</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">
                          {student.prefix}{student.first_name} {student.last_name}
                        </p>
                      </div>
                    </div>
                    
                    <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#06C755]' : ''}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out bg-gray-50/80 dark:bg-gray-900/50 ${isExpanded ? 'max-h-60 opacity-100 border-t border-gray-100 dark:border-gray-700' : 'max-h-0 opacity-0'}`}
                  >
                    <div className="p-5 grid grid-cols-2 gap-y-4 gap-x-2">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">ห้องเรียน</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{student.classroom || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">วันเกิด</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatThaiDate(student.birth_date)}</p>
                      </div>
                      
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">สถานะ</p>
                        <span className="inline-block px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-bold rounded-lg">
                          {student.remark || "รับใหม่"}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">เลขบัตรประชาชน</p>
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{student.citizen_id || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Pagination */}
      {filteredStudents.length > 0 && (
        <div className="shrink-0 px-5 pb-8 pt-2 bg-gray-50 dark:bg-gray-900 z-30 transition-colors">
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#06C755] disabled:text-gray-300 dark:disabled:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="text-xs font-bold text-gray-600 dark:text-gray-300">
              หน้า <span className="text-[#06C755]">{currentPage}</span> จาก {totalPages}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#06C755] disabled:text-gray-300 dark:disabled:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function StudentTablePage() {
  const router = useRouter();
  const { theme, toggleTheme } = useLiff(); // 🆕 เรียกใช้ Context

  return (
    <div className="h-[100dvh] bg-gray-50 dark:bg-gray-900 max-w-md mx-auto shadow-2xl relative overflow-hidden flex flex-col transition-colors duration-300">
      
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />

      {/* 1. App Header */}
      <header className="bg-white dark:bg-gray-800 px-5 pt-10 pb-4 shrink-0 z-40 shadow-sm flex items-center justify-between relative transition-colors">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/liff-front')}
            className="p-2 -ml-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-gray-800 dark:text-white leading-tight">
              รายชื่อนักเรียน
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">ข้อมูลทั้งหมดจากระบบ</p>
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

      <main className="flex-1 flex flex-col overflow-hidden">
        <Suspense fallback={
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
            <p className="text-gray-400 dark:text-gray-500 text-sm">กำลังโหลดข้อมูลนักเรียน...</p>
          </div>
        }>
          <StudentTableContent />
        </Suspense>
      </main>
    </div>
  );
}