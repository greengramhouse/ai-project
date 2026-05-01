"use client";

import { useState, useEffect, SubmitEventHandler } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import "react-quill-new/dist/quill.snow.css";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLiff } from "../layout";

// 🚀 นำเข้า ReactQuill แบบ Dynamic เพื่อป้องกัน Error เรื่อง Window is not defined บน Next.js
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="min-h-75 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium text-sm animate-pulse">
          กำลังโหลดเครื่องมือเขียนข่าว...
        </p>
      </div>
    </div>
  ),
});

// --- รายการตัวเลือกสำหรับ Form ---
const TAG_OPTIONS = ["วิชาการ", "กิจกรรม", "ประกาศ", "อบรม", "ทั่วไป"];
const COLOR_OPTIONS = [
  { name: "สีฟ้า (Blue)", class: "bg-blue-500" },
  { name: "สีม่วง (Purple)", class: "bg-purple-500" },
  { name: "สีส้ม (Orange)", class: "bg-orange-500" },
  { name: "สีชมพู (Pink)", class: "bg-pink-500" },
  { name: "สีเขียว (Emerald)", class: "bg-emerald-500" },
];

export default function CreateNewsForm() {
  const router = useRouter();
  const { isReady, profile } = useLiff();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [tag, setTag] = useState(TAG_OPTIONS[0]);
  const [color, setColor] = useState(COLOR_OPTIONS[0].class);

  // State สำหรับเนื้อหา Quill
  const [content, setContent] = useState("");

  // State สำหรับเก็บ URL รูปภาพ (เป็น Array เพื่อให้เพิ่มได้หลายรูป)
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // States สำหรับควบคุม UI
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 🛡️ 1. ตรวจสอบสิทธิ์การเข้าถึง (Admin Only)
  useEffect(() => {
    if (isReady) {
      const ADMIN_USER_IDS = [process.env.NEXT_PUBLIC_ADMIN_UID].filter(Boolean);
      const isAdmin = profile?.userId && ADMIN_USER_IDS.includes(profile.userId);

      if (!isAdmin) {
        alert("คุณไม่มีสิทธิ์เข้าถึงหน้านี้");
        router.replace("/liff-front");
      } else {
        setIsCheckingAuth(false);
      }
    }
  }, [isReady, profile, router]);

  // 🖼️ ฟังก์ชันจัดการ URL รูปภาพ
  const addImageUrlInput = () => {
    setImageUrls([...imageUrls, ""]); // เพิ่มช่องว่าง 1 ช่อง
  };

  const handleImageUrlChange = (index: number, value: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  const removeImageUrlInput = (index: number) => {
    const newUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(newUrls);
  };

  // 💾 ฟังก์ชันบันทึกข้อมูล
  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async(e) => {
    e.preventDefault();

    // ตรวจสอบว่ากรอกข้อมูลครบถ้วนหรือไม่ (Quill จะคืนค่า <p><br></p> เมื่อว่างเปล่า)
    const isContentEmpty =
      content.replace(/<[^>]*>?/gm, "").trim().length === 0;

    if (!title || !date || isContentEmpty) {
      setMessage({
        type: "error",
        text: "กรุณากรอกข้อมูลให้ครบถ้วน โดยเฉพาะเนื้อหาข่าว",
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setIsLoading(true);

    // 🧹 กรองเอาเฉพาะ URL ที่ไม่ว่างเปล่า
    const validImageUrls = imageUrls.filter((url) => url.trim() !== "");

    // 📦 แพ็คเกจข้อมูลเตรียมส่งเข้า Firebase Firestore
    const newNewsData = {
      title,
      date,
      tag,
      color,
      content: content, // ดึงเนื้อหาจาก ReactQuill โดยตรง
      images: validImageUrls,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "news"), newNewsData);

      console.log("บันทึกข้อมูลสำเร็จ:", newNewsData);
      setMessage({
        type: "success",
        text: "🎉 บันทึกข่าวประชาสัมพันธ์สำเร็จแล้ว!",
      });

      // เคลียร์ Form
      setTitle("");
      setDate("");
      setImageUrls([]);
      setContent(""); // ล้างเนื้อหาใน Quill

      // หน่วงเวลาเล็กน้อยแล้วพากลับไปหน้าแรก (เหมือนหน้า Edit)
      setTimeout(() => {
        router.push("/liff-front");
      }, 1500);
    } catch (error) {
      setMessage({ type: "error", text: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // ตั้งค่า Toolbar สำหรับ React Quill
  const quillModules = {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ header: 2 }, { header: 3 }],
      [{ list: "bullet" }, { list: "ordered" }],
      ["link"], // 🆕 เพิ่มปุ่มแทรกลิงก์
      ["clean"], // ปุ่มลบการจัดรูปแบบ
    ],
  };

  // ⏳ แสดง Loading ตอนกำลังตรวจสอบสิทธิ์
  if (!isReady || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center transition-colors">
        <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          กำลังตรวจสอบสิทธิ์...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-5 transition-colors">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <button 
            onClick={handleCancel}
            className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors shadow-sm shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white">
              สร้างข่าวประชาสัมพันธ์ 📢
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              เพิ่มข้อมูลและรายละเอียดข่าวสารใหม่ลงในระบบ
            </p>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            <span className="text-xl">
              {message.type === "success" ? "✅" : "❌"}
            </span>
            <p className="font-bold text-sm">{message.text}</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
        >
          <div className="p-6 md:p-8 space-y-8">
            {/* 1. ส่วนข้อมูลพื้นฐาน (Metadata) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  หัวข้อข่าว / ชื่อเรื่อง
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น กำหนดการสอบกลางภาค..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  วันที่ (แสดงผล)
                </label>
                <input
                  type="text"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="เช่น 15 พ.ค. 2569"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  หมวดหมู่
                </label>
                <select
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none transition-all dark:text-white appearance-none cursor-pointer"
                >
                  {TAG_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  สีป้ายกำกับ (Theme Color)
                </label>
                <div className="flex flex-wrap gap-3">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.class}
                      type="button"
                      onClick={() => setColor(c.class)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${color === c.class ? "border-gray-800 dark:border-white shadow-md" : "border-transparent bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                    >
                      <span
                        className={`w-4 h-4 rounded-full ${c.class}`}
                      ></span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {c.name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-gray-700" />

            {/* 2. ส่วนเพิ่มรูปภาพ (Image URLs) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    🖼️ รูปภาพประกอบ (ถ้ามี)
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    วางลิงก์ (URL) ของรูปภาพที่ฝากไว้ที่อื่น เช่น Facebook,
                    Google Drive, Imgur
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addImageUrlInput}
                  className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  เพิ่มรูปภาพ
                </button>
              </div>

              {imageUrls.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    ยังไม่มีรูปภาพประกอบ (สามารถข้ามส่วนนี้ได้)
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {imageUrls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2"
                    >
                      <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        </div>
                        <input
                          type="url"
                          value={url}
                          onChange={(e) =>
                            handleImageUrlChange(index, e.target.value)
                          }
                          placeholder="https://example.com/image.jpg"
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent outline-none transition-all dark:text-white text-sm"
                        />
                      </div>

                      {/* รูปภาพ Preview ขนาดเล็ก */}
                      {url.trim() && (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0 hidden sm:block">
                          <img
                            src={url}
                            alt="preview"
                            className="w-full h-full object-cover"
                            onError={(e) =>
                              (e.currentTarget.src =
                                "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgZD0iTTEwIDE0bDJtMCAwTDkgMTBtMyA0bDMgNG0wIDBMMjAgNG0tMyA0TDUgMjAiLz48L3N2Zz4=")
                            }
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => removeImageUrlInput(index)}
                        className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        title="ลบรูปภาพนี้"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-gray-100 dark:border-gray-700" />

            {/* 3. ส่วนเนื้อหา (Rich Text Editor ของจริง) */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                📝 เนื้อหาข่าว
              </label>

              <div className="rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-[#06C755] transition-all bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  placeholder="พิมพ์รายละเอียดข่าวสารที่นี่..."
                  className="quill-editor"
                />
              </div>

              {/* สไตล์เพิ่มเติมสำหรับจัดการความสูงของ React Quill และรองรับ Dark Mode */}
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                .quill-editor .ql-container {
                  min-height: 250px;
                  font-family: inherit;
                  font-size: 1rem;
                }
                .quill-editor .ql-editor {
                  min-height: 250px;
                }
                /* CSS สำหรับ Dark Mode ของ Quill Editor */
                .dark .quill-editor .ql-toolbar {
                  background-color: #1f2937;
                  border-color: #374151;
                }
                .dark .quill-editor .ql-container {
                  border-color: #374151;
                }
                .dark .quill-editor .ql-editor {
                  color: #f3f4f6;
                }
                .dark .quill-editor .ql-stroke {
                  stroke: #9ca3af;
                }
                .dark .quill-editor .ql-fill {
                  fill: #9ca3af;
                }
                .dark .quill-editor .ql-picker-label, 
                .dark .quill-editor .ql-picker-item {
                  color: #9ca3af;
                }
                .dark .quill-editor .ql-picker-options {
                  background-color: #1f2937;
                  border-color: #374151;
                }
              `,
                }}
              />
            </div>
          </div>

          {/* ปุ่ม Submit */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-8 py-3 rounded-xl font-bold text-white bg-[#06C755] hover:bg-[#05b34c] shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                  บันทึกข่าวสาร
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}