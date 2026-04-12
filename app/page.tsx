"use client";

import { useState, useRef, useEffect } from "react";

// กำหนดโครงสร้างของข้อความแชท
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: any[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: "สวัสดีค่ะ ฉันคือผู้ช่วย AI ของโรงเรียนชุมชนวัดไทยงาม มีอะไรให้ฉันช่วยไหมคะ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // เลื่อนจอลงอัตโนมัติเมื่อมีข้อความใหม่
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput(""); // ล้างช่องพิมพ์

    // 1. นำข้อความผู้ใช้ใส่ในแชท
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };
    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    // สร้าง ID สำหรับข้อความของ AI ที่กำลังจะมา
    const aiMessageId = (Date.now() + 1).toString();
    
    // เตรียมกล่องข้อความว่างๆ ของ AI ไว้รอรับข้อมูล
    setMessages((prev) => [
      ...prev,
      { id: aiMessageId, role: "assistant", content: "", sources: [] },
    ]);

    try {
      // 2. ยิง API แบบ Stream ไปหา Backend (แก้ URL เป็น /api/ai/steam)
      const response = await fetch("/api/ai/steam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      if (!response.ok || !response.body) throw new Error("Network response was not ok");

      // 3. อ่านข้อมูลแบบ Stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let aiContent = "";
      let aiSources: any[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // แปลงข้อมูลที่ได้มาเป็นตัวหนังสือ
        const chunkText = decoder.decode(value, { stream: true });
        
        // 🔍 LOG 1: ดูข้อมูลดิบที่เพิ่งเดินทางมาถึงแบบสดๆ
        // console.log("📦 [Raw Stream Chunk]:", chunkText);
        
        buffer += chunkText;
        
        // แยกข้อมูลด้วยบรรทัดใหม่
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // เก็บเศษที่ยังส่งมาไม่ครบไว้รอบถัดไป

        for (const line of lines) {
          if (line.trim() === "") continue;
          try {
            const parsed = JSON.parse(line);
            
            // 🔍 LOG 2: ดูข้อมูลที่แยกก้อนและพร้อมใช้งานแล้ว
            // console.log("🧩 [Parsed Line]:", parsed);
            
            // ถ้าเป็นข้อมูลอ้างอิง ให้เก็บลง sources และอัปเดตทันที
            if (parsed.type === "sources") {
              aiSources = parsed.data;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId ? { ...msg, sources: aiSources } : msg
                )
              );
            } 
            // ถ้าเป็นข้อความ ให้เอามาทะยอยพิมพ์ (Visual Typewriter Effect)
            else if (parsed.type === "text") {
              const newTextChunk = parsed.data;
              
              // ลูปแสดงผลทีละตัวอักษรเพื่อรับประกันเอฟเฟกต์ค่อยๆ พิมพ์
              for (let i = 0; i < newTextChunk.length; i++) {
                aiContent += newTextChunk[i];
                
                // อัปเดตหน้าจอแบบ Real-time
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? { ...msg, content: aiContent }
                      : msg
                  )
                );
                
                // ✨ หัวใจสำคัญ: หน่วงเวลา 15ms ต่อตัวอักษร (ปรับความเร็วได้ตามต้องการ)
                // ทำให้ถึงแม้หลังบ้านจะส่งมารวดเดียว หน้าบ้านก็ยังค่อยๆ พิมพ์ให้ดูอยู่ดี
                await new Promise((resolve) => setTimeout(resolve, 15));
              }
            }
          } catch (e) {
            console.error("Error parsing stream chunk", e);
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: "ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบ" }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ส่วนหัว (Header) */}
      <header className="bg-white border-b shadow-sm py-4 px-6 flex items-center justify-center sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-800">🏫 โรงเรียนชุมชนวัดไทยงาม AI</h1>
      </header>

      {/* พื้นที่แสดงข้อความแชท */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl shadow-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-none"
                    : "bg-white text-gray-800 border border-gray-100 rounded-tl-none"
                }`}
              >
                {/* เนื้อหาข้อความ */}
                <span className="whitespace-pre-wrap">{msg.content}</span>

                {/* ส่วนแสดงแหล่งอ้างอิง (ถ้ามี) */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-2">อ้างอิงจาก:</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md"
                        >
                          {source.metadata?.category || "เอกสาร"} (ความแม่นยำ: {Math.round(source.similarity * 100)}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* อนิเมชั่นจุดไข่ปลาตอนเริ่มรอ (จะหายไปทันทีที่ตัวอักษรแรกเริ่มพิมพ์) */}
          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-500 border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* พื้นที่พิมพ์ข้อความ */}
      <footer className="bg-white border-t p-4 pb-6 sm:pb-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="flex items-center space-x-2 bg-gray-100 p-1 rounded-full border focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400 transition-all"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์คำถามของคุณที่นี่..."
              className="flex-1 bg-transparent px-4 py-3 outline-none text-gray-700"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading && input.trim() === ""}
              className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}