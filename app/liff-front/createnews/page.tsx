"use client";

import { useState, useEffect, SubmitEventHandler } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import "react-quill-new/dist/quill.snow.css";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useLiff } from "../layout";
// 📌 1. นำเข้า SweetAlert2
import Swal from "sweetalert2";
import { triggerNewsRevalidation } from "@/lib/news-action";

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
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isReady) {
      const ADMIN_USER_IDS = [process.env.NEXT_PUBLIC_ADMIN_UID].filter(Boolean);
      const isAdmin = profile?.userId && ADMIN_USER_IDS.includes(profile.userId);

      if (!isAdmin) {
        // 📌 ใช้ SweetAlert แจ้งเตือนเรื่องสิทธิ์
        Swal.fire({
          icon: "error",
          title: "การเข้าถึงถูกปฏิเสธ",
          text: "คุณไม่มีสิทธิ์เข้าถึงหน้านี้",
          confirmButtonColor: "#06C755",
        }).then(() => {
          router.replace("/liff-front");
        });
      } else {
        setIsCheckingAuth(false);
      }
    }
  }, [isReady, profile, router]);

  const addImageUrlInput = () => {
    setImageUrls([...imageUrls, ""]);
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

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const isContentEmpty = content.replace(/<[^>]*>?/gm, "").trim().length === 0;

    if (!title || !date || isContentEmpty) {
      // 📌 ใช้ SweetAlert แจ้งเตือนกรอกข้อมูลไม่ครบ
      Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบถ้วน",
        text: "กรุณากรอกข้อมูลให้ครบถ้วน โดยเฉพาะเนื้อหาข่าว",
        confirmButtonColor: "#06C755",
      });
      return;
    }

    setIsLoading(true);

    const validImageUrls = imageUrls.filter((url) => url.trim() !== "");

    const newNewsData = {
      title,
      date,
      tag,
      color,
      content: content, 
      images: validImageUrls,
      createdAt: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "news"), newNewsData);
      await triggerNewsRevalidation();

      // 📌 ใช้ SweetAlert แจ้งเตือนเมื่อบันทึกสำเร็จ
      Swal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ!",
        text: "ข่าวประชาสัมพันธ์ของคุณถูกบันทึกเรียบร้อยแล้ว",
        showConfirmButton: false,
        timer: 2000,
      });

      setTitle("");
      setDate("");
      setImageUrls([]);
      setContent(""); 

      setTimeout(() => {
        router.push("/liff-front");
      }, 2000);
    } catch (error) {
      console.error("Save Error:", error);
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const quillModules = {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ header: 2 }, { header: 3 }],
      [{ list: "bullet" }, { list: "ordered" }],
      ["link"], 
      ["clean"], 
    ],
  };

  if (!isReady || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 text-center transition-colors">
        <div className="w-12 h-12 border-4 border-[#06C755]/20 border-t-[#06C755] rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-medium">กำลังตรวจสอบสิทธิ์...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-5 transition-colors">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button onClick={handleCancel} className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors shadow-sm shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white">สร้างข่าวประชาสัมพันธ์ 📢</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">เพิ่มข้อมูลและรายละเอียดข่าวสารใหม่ลงในระบบ</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">
            {/* Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">หัวข้อข่าว / ชื่อเรื่อง</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น กำหนดการสอบกลางภาค..." className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none transition-all dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">วันที่ (แสดงผล)</label>
                <input type="text" value={date} onChange={(e) => setDate(e.target.value)} placeholder="เช่น 15 พ.ค. 2569" className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none transition-all dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">หมวดหมู่</label>
                <select value={tag} onChange={(e) => setTag(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-[#06C755] focus:border-transparent outline-none transition-all dark:text-white appearance-none cursor-pointer">
                  {TAG_OPTIONS.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">สีป้ายกำกับ (Theme Color)</label>
                <div className="flex flex-wrap gap-3">
                  {COLOR_OPTIONS.map((c) => (
                    <button key={c.class} type="button" onClick={() => setColor(c.class)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all ${color === c.class ? "border-gray-800 dark:border-white shadow-md" : "border-transparent bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
                      <span className={`w-4 h-4 rounded-full ${c.class}`}></span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <hr className="border-gray-100 dark:border-gray-700" />

            {/* Images Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">🖼️ รูปภาพประกอบ (ถ้ามี)</label>
                <button type="button" onClick={addImageUrlInput} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-2">
                  เพิ่มรูปภาพ
                </button>
              </div>
              {imageUrls.map((url, index) => (
                <div key={index} className="flex items-center gap-3 mb-3">
                  <input type="url" value={url} onChange={(e) => handleImageUrlChange(index, e.target.value)} placeholder="https://example.com/image.jpg" className="flex-1 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 outline-none text-sm dark:text-white" />
                  <button type="button" onClick={() => removeImageUrlInput(index)} className="p-3 text-red-400 hover:text-red-600">🗑️</button>
                </div>
              ))}
            </div>

            <hr className="border-gray-100 dark:border-gray-700" />

            {/* Editor */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">📝 เนื้อหาข่าว</label>
              <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                <ReactQuill theme="snow" value={content} onChange={setContent} modules={quillModules} placeholder="พิมพ์รายละเอียดข่าวสารที่นี่..." className="quill-editor" />
              </div>
              <style dangerouslySetInnerHTML={{ __html: `.quill-editor .ql-container { min-height: 250px; } .quill-editor .ql-editor { min-height: 250px; } .dark .quill-editor .ql-toolbar { background-color: #1f2937; border-color: #374151; } .dark .quill-editor .ql-container { border-color: #374151; } .dark .quill-editor .ql-editor { color: #f3f4f6; }` }} />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-4">
            <button type="button" onClick={handleCancel} className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">ยกเลิก</button>
            <button type="submit" disabled={isLoading} className="px-8 py-3 rounded-xl font-bold text-white bg-[#06C755] hover:bg-[#05b34c] shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
              {isLoading ? "กำลังบันทึก..." : "บันทึกข่าวสาร"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}