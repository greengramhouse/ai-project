"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link"; // 🆕 นำเข้า Link เพื่อใช้สำหรับเชื่อมหน้าต่าง ๆ

// กำหนดโครงสร้างของข้อความแชท
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: any[];
}

export default function LandingPage() {
  // --------------------------------------------------------
  // 1. State สำหรับระบบแชท
  // --------------------------------------------------------
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content: "สวัสดีค่ะ ฉันคือผู้ช่วย AI ของโรงเรียนชุมชนวัดไทยงาม มีอะไรให้ฉันช่วยไหมคะ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs สำหรับเลื่อนจอและโฟกัสช่องพิมพ์
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------
  // 2. State สำหรับเอฟเฟกต์เมาส์ขยับ (Parallax)
  // --------------------------------------------------------
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // คำนวณหาจุดศูนย์กลางของจอ
      const x = (e.clientX - window.innerWidth / 2) / 50;
      const y = (e.clientY - window.innerHeight / 2) / 50;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // เลื่อนจอแชทลงล่างสุดอัตโนมัติ
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isChatOpen]);

  // Auto-Focus ช่องพิมพ์
  useEffect(() => {
    if (isChatOpen && !isLoading && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isChatOpen, isLoading]);

  // --------------------------------------------------------
  // 3. ฟังก์ชันจัดการการส่งข้อความ
  // --------------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput(""); 

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
    };
    setMessages((prev) => [...prev, newMessage]);
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    
    setMessages((prev) => [
      ...prev,
      { id: aiMessageId, role: "assistant", content: "", sources: [] },
    ]);

    try {
      const response = await fetch("/api/ai/steam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      if (!response.ok || !response.body) throw new Error("Network response was not ok");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let aiContent = "";
      let aiSources: any[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.type === "sources") {
              aiSources = parsed.data;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === aiMessageId ? { ...msg, sources: aiSources } : msg
                )
              );
            } 
            else if (parsed.type === "text") {
              const newTextChunk = parsed.data;
              
              for (let i = 0; i < newTextChunk.length; i++) {
                aiContent += newTextChunk[i];
                
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId ? { ...msg, content: aiContent } : msg
                  )
                );
                
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-white">
      
      {/* 🆕 ปุ่มเข้าสู่ระบบ / ไปยังหน้า Portal (มุมขวาบน) */}
      <div className="absolute top-6 right-6 md:top-8 md:right-10 z-50">
        <Link 
          href="/liff-front"
          className="group flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/20 transition-all font-medium text-sm shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] active:scale-95"
        >
          <span>เข้าสู่ระบบ</span>
          <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      {/* เอฟเฟกต์ฉากหลัง */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-125 h-125 rounded-full bg-blue-600/30 blur-[100px] pointer-events-none transition-transform duration-300 ease-out"
        style={{ transform: `translate(${mousePos.x * -2}px, ${mousePos.y * -2}px)` }}
      />
      <div 
        className="absolute bottom-[-10%] right-[-5%] w-150 h-150 rounded-full bg-purple-600/20 blur-[120px] pointer-events-none transition-transform duration-300 ease-out"
        style={{ transform: `translate(${mousePos.x * 3}px, ${mousePos.y * 3}px)` }}
      />
      <div 
        className="absolute top-[30%] left-[60%] w-75 h-75 rounded-full bg-indigo-500/20 blur-[80px] pointer-events-none transition-transform duration-300 ease-out"
        style={{ transform: `translate(${mousePos.x * -1.5}px, ${mousePos.y * 1.5}px)` }}
      />

      {/* เนื้อหา Landing Page */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div 
          className="p-8 md:p-12 backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl shadow-2xl max-w-4xl transition-transform duration-500 ease-out"
          style={{ transform: `translate(${mousePos.x * 0.5}px, ${mousePos.y * 0.5}px)` }}
        >
          <div className="inline-block px-4 py-1.5 mb-6 text-sm font-medium tracking-wider text-blue-300 uppercase bg-blue-900/40 rounded-full border border-blue-500/30">
            Welcome to the future of education
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-linear-to-r from-blue-400 via-indigo-300 to-purple-400">
            โรงเรียนชุมชนวัดไทยงาม
          </h1>
          <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            ก้าวสู่ยุคใหม่ของการเรียนรู้ด้วยเทคโนโลยี AI อัจฉริยะ 
            สอบถามข้อมูล ระเบียบการ หรือค้นหาเอกสารต่างๆ ได้ทันทีผ่านผู้ช่วยส่วนตัวของเรา
          </p>
          <button 
            onClick={() => setIsChatOpen(true)}
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-blue-600 rounded-full hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 focus:ring-offset-slate-900 shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(37,99,235,0.6)]"
          >
            เริ่มต้นพูดคุยกับ AI
            <svg className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </main>

      {/* Floating Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        
        {isChatOpen && (
          <div className="w-85 sm:w-100 h-137.5 max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col mb-4 overflow-hidden border border-gray-200 transform origin-bottom-right transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in">
            
            {/* Header แชท */}
            <div className="bg-linear-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center shadow-md z-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-xl">🏫</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">ผู้ช่วย AI วัดไทยงาม</h3>
                  <p className="text-xs text-blue-100 flex items-center">
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                    ออนไลน์พร้อมตอบ
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* พื้นที่แสดงข้อความ */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm text-sm ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-tr-sm"
                      : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"
                  }`}>
                    <span className="whitespace-pre-wrap leading-relaxed">{msg.content}</span>

                    {/* แหล่งอ้างอิง */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-100/20">
                        <p className={`text-[10px] font-semibold mb-1 ${msg.role === "user" ? "text-blue-200" : "text-gray-400"}`}>อ้างอิงจาก:</p>
                        <div className="flex flex-wrap gap-1">
                          {msg.sources.map((source, idx) => (
                            <span key={idx} className={`text-[9px] px-1.5 py-0.5 rounded-md ${msg.role === "user" ? "bg-blue-700 text-blue-100" : "bg-gray-100 text-gray-500"}`}>
                              {source.metadata?.type === 'pdf' ? '📄' : '📝'} {source.metadata?.source || "เอกสาร"}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* อนิเมชั่นกำลังพิมพ์ */}
              {isLoading && messages[messages.length - 1]?.content === "" && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm border border-gray-100 flex space-x-1.5">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ช่องพิมพ์ข้อความ */}
            <div className="p-3 bg-white border-t">
              <form onSubmit={handleSubmit} className="flex items-center bg-gray-100 p-1 rounded-full border border-transparent focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <input
                  ref={inputRef} 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="พิมพ์คำถามที่นี่..."
                  className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-gray-700 disabled:opacity-50"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ปุ่มวงกลม (FAB) สำหรับเปิด/ปิดแชท */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`relative flex items-center justify-center w-14 h-14 rounded-full text-white shadow-xl transition-transform duration-300 hover:scale-110 active:scale-95 ${
            isChatOpen ? "bg-slate-800 rotate-90" : "bg-linear-to-tr from-blue-600 to-purple-600 animate-bounce hover:animate-none"
          }`}
        >
          {isChatOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          )}
          
          {!isChatOpen && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
            </span>
          )}
        </button>
      </div>
    </div>
  );
}