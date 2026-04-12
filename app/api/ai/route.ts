import { prisma } from "@/lib/prisma"
import { getGeminiResponse } from "@/lib/ai/gemini"
import { NextResponse } from "next/server"
import { searchDocuments } from "@/lib/ai/vector-search"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const { message, sessionId: clientSessionId } = await request.json()

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // ✅ สร้าง sessionId ถ้ายังไม่มี
    const sessionId = clientSessionId || randomUUID()

    // 📥 1. บันทึกคำถามของ User
    // await prisma.chatMessage.create({
    //   data: {
    //     sessionId,
    //     role: "user",
    //     content: message
    //   }
    // })

    // 🔎 2. ค้นหาเอกสาร RAG
    const searchResults = await searchDocuments(message, 3)
    const context = searchResults.map((doc) => `- ${doc.content}`).join("\n")

    // 🧠 3. Prompt
const finalPrompt = `คุณคือ "AI เจ้าหน้าที่ธุรการ" ผู้ช่วยใจดีของโรงเรียนชุมชนวัดไทยงาม
  
  กฎการปฏิบัติงาน:
  1. การทักทาย: หากผู้ใช้พิมพ์คำทักทายทั่วไป (เช่น สวัสดี, ดีจ้า, ขอบคุณ) ให้ตอบกลับอย่างสุภาพ เป็นมิตร และเสนอตัวช่วยเหลือ โดยไม่ต้องสนบริบท (Context)
  2. การตอบคำถาม: หากผู้ใช้ถามคำถาม ให้ตอบโดยอิงจากข้อมูลในช่อง [CONTEXT] ด้านล่างนี้เท่านั้น ห้ามแต่งเรื่องหรือเดาเอาเองเด็ดขาด
  3. หากตอบไม่ได้: หากคำถามนั้นไม่มีข้อมูลระบุไว้ใน [CONTEXT] ให้ตอบอย่างสุภาพว่า "ขออภัยค่ะ ระบบยังไม่มีข้อมูลในส่วนนี้ ลองสอบถามคุณครูฝ่ายธุรการโดยตรงนะคะ" หรือตอบในประเด็นที่ไกล้เคียงกันมากที่สุด
  4. อาจตอบเพิ่มเติม : หากเป็นเรื่องการขอความช่วยเหลือด้านการร่างหนังสือราชการ หรือ ร่างจดหมายนำส่งต่างๆ เพื่อให้เหมาะสมกับเป็นเจ้าหน้าที่ธุรการ
  
  [CONTEXT ข้อมูลที่ค้นพบ]:
  ${context ? context : "ไม่มีข้อมูลที่เกี่ยวข้อง (อาจเป็นเพราะผู้ใช้แค่ทักทาย หรือถามนอกเรื่อง)"}
  
  [ข้อความจากผู้ใช้]: ${message}`;

    const responseText = await getGeminiResponse(finalPrompt)

    // 📥 4. บันทึกคำตอบ AI
    // await prisma.chatMessage.create({
    //   data: {
    //     sessionId,
    //     role: "assistant",
    //     content: responseText,
    //     sources: searchResults.map(s => ({
    //       content: s.content,
    //       similarity: s.similarity,
    //       source: s.metadata?.source
    //     }))
    //   }
    // })

    return NextResponse.json({
      text: responseText,
      sources: searchResults,
      sessionId // ✅ ส่งกลับไปให้ client เก็บ
    })

  } catch (error: any) {
    console.error("Chat API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}