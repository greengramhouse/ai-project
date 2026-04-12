import { NextResponse } from "next/server"
import { getGeminiResponse } from "@/lib/ai/gemini"
import crypto from "crypto"
import { searchDocuments } from "@/lib/ai/vector-search"

// เตรียม Environment Variables จากหน้า LINE Developers
const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ""
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ""

// ฟังก์ชันตรวจสอบ Signature เพื่อความปลอดภัยว่ามาจาก LINE จริงๆ
function verifySignature(rawBody: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) {
    console.warn("⚠️ LINE_CHANNEL_SECRET is not set. Signature verification might fail.")
    return false
  }
  const hash = crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64")
  return hash === signature
}

// ฟังก์ชันสำหรับส่งข้อความตอบกลับไปยัง LINE
async function replyLineMessage(replyToken: string, messages: any[]) {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        replyToken: replyToken,
        messages: messages,
      }),
    })
    
    if (!response.ok) {
      console.error("LINE Reply Error:", await response.text())
    }
  } catch (error) {
    console.error("Fetch Error:", error)
  }
}

export async function POST(request: Request) {
  try {
    // อ่านข้อมูลดิบ (Raw Text) เพื่อนำไปตรวจสอบ Signature ก่อน
    const rawBody = await request.text()
    
    // ดึงค่า Signature จาก Header ที่ LINE ส่งมา
    const signature = request.headers.get("x-line-signature") || ""

    // 🔒 ตรวจสอบความปลอดภัย
    if (!verifySignature(rawBody, signature)) {
      console.error("❌ Invalid LINE Signature!")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    // เมื่อผ่านการตรวจสอบแล้ว ค่อยแปลงข้อมูลกลับเป็น JSON
    const body = JSON.parse(rawBody)

    // LINE Webhook จะส่ง events มาเป็น Array
    const events = body.events || []

    for (const event of events) {
      // ตรวจสอบว่าเป็น event ประเภทข้อความหรือไม่
      if (event.type === "message") {
        const replyToken = event.replyToken
        const sourceType = event.source.type // 'user', 'group', หรือ 'room'

        // ---------------------------------------------------------
        // 1. จัดการข้อความประเภท TEXT
        // ---------------------------------------------------------
        if (event.message.type === "text") {
          let text = event.message.text.trim()
          const lowerText = text.toLowerCase()

          // ตรวจสอบเงื่อนไขถ้าบอทอยู่ในกลุ่ม (Group/Room)
          const isGroupChat = sourceType === "group" || sourceType === "room"
          let shouldProcessAI = true

          if (isGroupChat) {
            if (lowerText.startsWith("ai/")) {
              text = text.slice(3).trim() // ตัดคำว่า ai/ ออก
            } else if (lowerText.startsWith("bot/")) {
              text = text.slice(4).trim() // ตัดคำว่า bot/ ออก
            } else {
              // ถ้าอยู่ในกลุ่ม แต่ไม่ได้ขึ้นต้นด้วย ai/ หรือ bot/ ให้ข้ามไปเลย ไม่ต้องทำอะไร
              shouldProcessAI = false
            }
          }

          // ถ้าผ่านเงื่อนไขให้ประมวลผลต่อ
          if (shouldProcessAI && text.length > 0) {
            
            // --- 💡 กำหนด Keyword พิเศษตรงนี้ (ไม่ต้องผ่าน AI) ---
            if (lowerText === "ติดต่อ" || lowerText === "ติดต่อสอบถาม") {
              await replyLineMessage(replyToken, [{ 
                type: "text", 
                text: "สามารถติดต่อห้องวิชาการได้ที่เบอร์ 02-XXX-XXXX ค่ะ" 
              }])
              continue // จบลูปของ event นี้เลย
            }

            if (lowerText === "ขอสติกเกอร์") {
              await replyLineMessage(replyToken, [{ 
                type: "sticker", 
                packageId: "446", 
                stickerId: "1988" 
              }])
              continue
            }
            // --------------------------------------------------

            // --- 🤖 ส่งเข้า RAG & Gemini (ถ้าไม่ตรง Keyword) ---
            try {
              // ดึงข้อมูล RAG จาก Database
              const searchResults = await searchDocuments(text, 3)
              
              let context = ""
              if (searchResults.length > 0) {
                context = searchResults.map((doc) => `- ${doc.content}`).join("\n")
              } else {
                context = "ไม่มีข้อมูลอ้างอิงในฐานข้อมูล"
              }

              // เตรียม Prompt 
              const finalPrompt = `คุณคือ AI ผู้ช่วยตอบคำถามของโรงเรียนชุมชนวัดไทยงาม
จงตอบคำถามโดยใช้ข้อมูลจาก "ข้อมูลอ้างอิง" ด้านล่างนี้เท่านั้น
คุณสามารถเรียบเรียงคำตอบใหม่ให้อ่านง่ายและเป็นธรรมชาติได้ ไม่ต้องบอกว่าอ้างอิงมาจากไหน

ข้อมูลอ้างอิง:
${context}

คำถาม: ${text}
คำตอบ:`

              const aiResponseText = await getGeminiResponse(finalPrompt)

              // ส่งคำตอบ AI กลับไปที่ LINE
              await replyLineMessage(replyToken, [{ type: "text", text: aiResponseText }])

            } catch (aiError) {
              console.error("AI Error:", aiError)
              await replyLineMessage(replyToken, [{ 
                type: "text", 
                text: "ขออภัยค่ะ ระบบ AI ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะคะ" 
              }])
            }
          }
        } 
        
        // ---------------------------------------------------------
        // 2. จัดการข้อความประเภท STICKER (ทำโครงทิ้งไว้)
        // ---------------------------------------------------------
        else if (event.message.type === "sticker") {
          // ถ้าเป็นส่วนตัว ให้ส่งสติกเกอร์ตอบกลับขำๆ
          if (sourceType === "user") {
            await replyLineMessage(replyToken, [{ 
              type: "sticker", 
              packageId: "11537", 
              stickerId: "52002735" 
            }])
          }
        } 
        
        // ---------------------------------------------------------
        // 3. จัดการข้อความประเภท IMAGE (ทำโครงทิ้งไว้)
        // ---------------------------------------------------------
        else if (event.message.type === "image") {
          // const imageId = event.message.id;
          // เตรียมไว้ดึงรูปจาก LINE API มาทำ Vision AI ในอนาคต
          if (sourceType === "user") {
            await replyLineMessage(replyToken, [{ 
              type: "text", 
              text: "ได้รับรูปภาพแล้วค่ะ แต่ฉันยังไม่ได้เรียนรู้วิธีดูภาพในตอนนี้นะคะ" 
            }])
          }
        }
      }
    }

    // ต้องตอบ 200 OK กลับไปให้ LINE เสมอ เพื่อบอกว่าได้รับข้อมูลแล้ว
    return NextResponse.json({ status: "success" }, { status: 200 })

  } catch (error) {
    console.error("Webhook Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}