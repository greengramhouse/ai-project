import { prisma } from "@/lib/prisma"
import { getGeminiResponseStream } from "@/lib/ai/gemini"
import { searchDocuments } from "@/lib/ai/vector-search"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const { message, sessionId: clientSessionId } = await request.json()

    if (!message) {
      return new Response("Message is required", { status: 400 })
    }

    // ✅ สร้าง sessionId ถ้ายังไม่มี
    const sessionId = clientSessionId || randomUUID()

    console.log("\n📥 [Backend] ได้รับคำถาม:", message)

    // 📥 1. บันทึก user message
    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content: message
      }
    })

    // 🔎 2. ค้นหา RAG
    const searchResults = await searchDocuments(message, 3)
    console.log(`🔍 เจอ ${searchResults.length} docs`)

    const encoder = new TextEncoder()

    // ❗ ถ้าไม่เจอข้อมูล
    if (searchResults.length === 0) {
      const readable = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(JSON.stringify({ type: "sources", data: [] }) + "\n")
          )
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "text",
                data: "ขออภัยค่ะ ไม่มีข้อมูลในส่วนนี้"
              }) + "\n"
            )
          )
          controller.close()
        }
      })

      return new Response(readable, {
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      })
    }

    // 🧠 3. สร้าง prompt
    const context = searchResults.map(d => `- ${d.content}`).join("\n")

const finalPrompt = `คุณคือ "AI เจ้าหน้าที่ธุรการ" ผู้ช่วยใจดีของโรงเรียนชุมชนวัดไทยงาม
  
  กฎการปฏิบัติงาน:
  1. การทักทาย: หากผู้ใช้พิมพ์คำทักทายทั่วไป (เช่น สวัสดี, ดีจ้า, ขอบคุณ) ให้ตอบกลับอย่างสุภาพ เป็นมิตร และเสนอตัวช่วยเหลือ โดยไม่ต้องสนบริบท (Context)
  2. การตอบคำถาม: หากผู้ใช้ถามคำถาม ให้ตอบโดยอิงจากข้อมูลในช่อง [CONTEXT] ด้านล่างนี้เท่านั้น ห้ามแต่งเรื่องหรือเดาเอาเองเด็ดขาด
  3. หากตอบไม่ได้: หากคำถามนั้นไม่มีข้อมูลระบุไว้ใน [CONTEXT] ให้ตอบอย่างสุภาพว่า "ขออภัยค่ะ ระบบยังไม่มีข้อมูลในส่วนนี้ ลองสอบถามคุณครูฝ่ายธุรการโดยตรงนะคะ" หรือตอบในประเด็นที่ไกล้เคียงกันมากที่สุด
  4. อาจตอบเพิ่มเติม : หากเป็นเรื่องการขอความช่วยเหลือด้านการร่างหนังสือราชการ หรือ ร่างจดหมายนำส่งต่างๆ หรือคำสั่งแต่งตั้ง เพื่อให้เหมาะสมกับเป็นเจ้าหน้าที่ธุรการ
  
  [CONTEXT ข้อมูลที่ค้นพบ]:
  ${context ? context : "ไม่มีข้อมูลที่เกี่ยวข้อง (อาจเป็นเพราะผู้ใช้แค่ทักทาย หรือถามนอกเรื่อง)"}
  
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
        await prisma.chatMessage.create({
          data: {
            sessionId,
            role: "assistant",
            content: fullText,
            sources: searchResults.map(s => ({
              content: s.content,
              similarity: s.similarity,
              source: s.metadata?.source
            }))
          }
        })

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