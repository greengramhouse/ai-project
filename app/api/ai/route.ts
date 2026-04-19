import { prisma } from "@/lib/prisma"
import { getGeminiResponse } from "@/lib/ai/gemini"
import { NextResponse } from "next/server"
import { searchDocuments } from "@/lib/ai/vector-search"
import { randomUUID } from "crypto"
import { SYSTEM_CORE_KNOWLEDGE } from "@/lib/ai/knonwledgeSystem"



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
    
    // ✅ จัดการกรณีที่หาข้อมูลจาก Vector DB ไม่เจอ (ป้องกันส่ง Context ว่างๆ ให้ AI งง)
    const context = searchResults.length > 0 
      ? searchResults.map((doc) => `- ${doc.content}`).join("\n") 
      : "- ไม่มีข้อมูลเพิ่มเติมจากฐานข้อมูลเอกสาร -";

    // 🧠 3. Prompt (ปรับปรุงกฎให้ชัดเจนขึ้น)
    const finalPrompt = `คุณคือ "AI เจ้าหน้าที่ธุรการ" ผู้ช่วยใจดีของโรงเรียนชุมชนวัดไทยงาม
  
  [SYSTEM_CORE_KNOWLEDGE: ข้อมูลพื้นฐานที่ต้องรู้]:
  ${SYSTEM_CORE_KNOWLEDGE}

  กฎการปฏิบัติงานอย่างเคร่งครัด:
  1. การตอบนอกเรื่อง: หากผู้ใช้ถามเรื่องอื่นที่ 'ไม่เกี่ยวข้อง' กับโรงเรียน, การเรียนการสอน, งานธุรการ หรือระบบฐานข้อมูล (เช่น ถามเรื่องการเมือง สภาพอากาศ แต่งนิยาย เขียนโค้ด) ให้ปฏิเสธอย่างสุภาพ
  2. การทักทาย: หากผู้ใช้พิมพ์คำทักทายทั่วไป (เช่น สวัสดี, ดีจ้า, ขอบคุณ) ให้ตอบกลับอย่างสุภาพ เป็นมิตร และเสนอตัวช่วยเหลือ โดยไม่ต้องค้นหาข้อมูล
  3. ลำดับการหาคำตอบ: เมื่อผู้ใช้ถามคำถาม ให้ค้นหาคำตอบตามลำดับนี้
     - ลำดับที่ 1: ค้นหาจาก [SYSTEM_CORE_KNOWLEDGE] ก่อนเสมอ
     - ลำดับที่ 2: หากไม่มีในลำดับแรก ให้ค้นหาจาก [CONTEXT: ข้อมูลจากเอกสาร]
  4. กรณีตอบไม่ได้: หากไม่พบข้อมูลทั้งสองส่วน ให้ตอบว่า "ขออภัยค่ะ ระบบยังไม่มีข้อมูลในส่วนนี้ ลองสอบถามคุณครูฝ่ายธุรการโดยตรงที่เบอร์ 0817410181 นะคะ"
  5. อาจตอบเพิ่มเติม: หากเป็นเรื่องการขอความช่วยเหลือด้านการร่างหนังสือราชการ ร่างจดหมายนำส่งต่างๆ หรือคำสั่งแต่งตั้ง ให้ปรับภาษาให้เหมาะสมและเป็นทางการในฐานะเจ้าหน้าที่ธุรการ
  
  [CONTEXT: ข้อมูลที่ค้นพบจากเอกสาร]:
  ${context}
  
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
      sources: searchResults, // ✅ ส่งกลับไปให้ client เก็บ
      sessionId
    })

  } catch (error: any) {
    console.error("Chat API Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}