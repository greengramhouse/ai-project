import { prisma } from "@/lib/prisma"
import { getGeminiResponseStream } from "@/lib/ai/gemini"
import { searchDocuments } from "@/lib/ai/vector-search"
import { randomUUID } from "crypto"
import { SYSTEM_CORE_KNOWLEDGE } from "@/lib/ai/knonwledgeSystem"





export async function POST(request: Request) {
  try {
    const { message, sessionId: clientSessionId } = await request.json()

    if (!message) {
      return new Response("Message is required", { status: 400 })
    }

    const sessionId = clientSessionId || randomUUID()
    console.log("\n📥 [Backend] ได้รับคำถาม:", message)

    // 📥 1. บันทึก user message
    // await prisma.chatMessage.create({
    //   data: {
    //     sessionId,
    //     role: "user",
    //     content: message
    //   }
    // })

    // 🔎 2. ค้นหา RAG
    const searchResults = await searchDocuments(message, 3)
    console.log(`🔍 เจอ ${searchResults.length} docs`)

    const encoder = new TextEncoder()

    // ❌ ลบเงื่อนไข if (searchResults.length === 0) ตรงนี้ออกไปเลย ❌

    // 🧠 3. สร้าง prompt
    // ✅ จัดการกรณีที่หาข้อมูลไม่เจอ ให้ส่ง string ว่าง หรือข้อความแจ้ง AI ไปแทน
    const context = searchResults.length > 0 
      ? searchResults.map(d => `- ${d.content}`).join("\n") 
      : "- ไม่มีข้อมูลเพิ่มเติมจากฐานข้อมูลเอกสาร -";

    // ✅ ปรับ Prompt เล็กน้อยตรงกฎข้อ 1 ให้สมบูรณ์ขึ้น (ในโค้ดเดิมเขียนค้างไว้)
    const finalPrompt = `คุณคือ "AI เจ้าหน้าที่ธุรการ" ผู้ช่วยใจดีของโรงเรียนชุมชนวัดไทยงาม
    ${SYSTEM_CORE_KNOWLEDGE}

  กฎการปฏิบัติงาน:
  1. หากผู้ใช้ถามเรื่องอื่นที่ 'ไม่เกี่ยวข้อง' กับโรงเรียน, การเรียนการสอน, งานธุรการ หรือระบบฐานข้อมูล (เช่น ถามเรื่องการเมือง สภาพอากาศ แต่งนิยาย เขียนโค้ด) ให้ปฏิเสธอย่างสุภาพ
  2. การทักทาย: หากผู้ใช้พิมพ์คำทักทายทั่วไป (เช่น สวัสดี, ดีจ้า, ขอบคุณ) ให้ตอบกลับอย่างสุภาพ เป็นมิตร และเสนอตัวช่วยเหลือ โดยไม่ต้องสนบริบท (Context)
  3. การตอบคำถาม: 
   - ลำดับแรก: ตรวจสอบข้อมูลจาก [SYSTEM_CORE_KNOWLEDGE] ก่อนเสมอ
   - ลำดับที่สอง: ตรวจสอบข้อมูลจาก [CONTEXT ข้อมูลจากเอกสาร] 
   - หากไม่พบข้อมูลทั้งสองส่วน ให้ตอบว่า "ขออภัยค่ะ ระบบยังไม่มีข้อมูลในส่วนนี้ ลองสอบถามคุณครูฝ่ายธุรการโดยตรงที่เบอร์ 0817410181 นะคะ"
   4. อาจตอบเพิ่มเติม: หากเป็นเรื่องการขอความช่วยเหลือด้านการร่างหนังสือราชการ หรือ ร่างจดหมายนำส่งต่างๆ หรือคำสั่งแต่งตั้ง เพื่อให้เหมาะสมกับเป็นเจ้าหน้าที่ธุรการ
  
  [CONTEXT ข้อมูลที่ค้นพบ]:
  ${context}
  
  [ข้อความจากผู้ใช้]: ${message}`;

    // 🚀 4. เรียก stream
    const stream = await getGeminiResponseStream(finalPrompt)

    // 🧠 เก็บข้อความทั้งหมดไว้ save ทีหลัง
    let fullText = ""

    const readable = new ReadableStream({
      async start(controller) {
        // ส่ง sources ก่อน
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "sources", data: searchResults }) + "\n"
          )
        )

        // รับ stream ทีละ chunk
        for await (const chunk of stream) {
          const chunkText = chunk.text()
          fullText += chunkText

          controller.enqueue(
            encoder.encode(
              JSON.stringify({ type: "text", data: chunkText }) + "\n"
            )
          )
        }

        // 📥 5. บันทึก AI response (หลัง stream เสร็จ)
        // await prisma.chatMessage.create({
        //   data: {
        //     sessionId,
        //     role: "assistant",
        //     content: fullText,
        //     sources: searchResults.map(s => ({
        //       content: s.content,
        //       similarity: s.similarity,
        //       source: s.metadata?.source
        //     }))
        //   }
        // })

        controller.close()
      }
    })

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    })

  } catch (error: any) {
    console.error("❌ Chat API Error:", error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    )
  }
}