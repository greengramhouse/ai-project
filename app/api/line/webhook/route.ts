import { NextResponse } from "next/server"
import { getGeminiResponse } from "@/lib/ai/gemini"
import crypto from "crypto"
import { searchDocuments } from "@/lib/ai/vector-search"
import { SYSTEM_CORE_KNOWLEDGE } from "@/lib/ai/knonwledgeSystem"

// เตรียม Environment Variables จากหน้า LINE Developers
const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ""
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ""




// ฟังก์ชันตรวจสอบ Signature เพื่อความปลอดภัยว่ามาจาก LINE จริงๆ
function verifySignature(rawBody: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) return false;
  const hash = crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64")
  return hash === signature
}

// 🆕 ฟังก์ชันใหม่: แสดงแอนิเมชันกำลังพิมพ์ (...)
async function startLoadingAnimation(chatId: string) {
  try {
    const response = await fetch("https://api.line.me/v2/bot/chat/loading/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        chatId: chatId,
        loadingSeconds: 10 // แสดงแอนิเมชัน 10 วินาที (ถ้าตอบกลับก่อน แอนิเมชันจะหายไปเอง)
      }),
    });
    
    if (!response.ok) {
      console.error("LINE Loading Animation Error:", await response.text());
    }
  } catch (error) {
    console.error("Fetch Error (Loading):", error);
  }
}

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


// 🆕 1. สร้างฟังก์ชันสำหรับจัดการ Keyword โดยเฉพาะ
// ถ้าตรงกับ Keyword ให้ Return Array ของ Message ถ้าไม่ตรงให้ Return null

function handleKeywordMessage(text: string): any[] | null {
  const lowerText = text.toLowerCase()

  // เงื่อนไขที่ 1: เช็คคำตรงเป๊ะ (Exact Match)
  if (lowerText === "ติดต่อ" || lowerText === "ติดต่อสอบถาม" || lowerText === "เบอร์โทร") {
    return [{ 
      type: "text", 
      text: "☎️ ติดต่อโรงเรียนชุมชนวัดไทยงาม\n- ฝ่ายธุรการ: 0817410181\n- ห้องวิชาการ: 02-XXX-XXXX\n(ติดต่อได้ในวันและเวลาราชการนะคะ)" 
    }];
  }

  // เงื่อนไขที่ 2: เช็คคำที่มีบางคำอยู่ข้างใน (Includes)
  if (lowerText.includes("ขอแบบฟอร์ม") || lowerText.includes("ดาวน์โหลดเอกสาร")) {
    return [{ 
      type: "text", 
      text: "📄 คุณสามารถดาวน์โหลดแบบฟอร์มคำร้องต่างๆ ได้ที่ลิงก์นี้เลยค่ะ:\nhttps://example-school.com/forms" 
    }];
  }

  // เงื่อนไขที่ 3: เช็คคำขึ้นต้น (Starts With)
  if (lowerText.startsWith("พิกัด") || lowerText.startsWith("แผนที่")) {
    // สามารถส่งเป็น Location Message ได้ด้วย
    return [{
      type: "location",
      title: "โรงเรียนชุมชนวัดไทยงาม",
      address: "54 หมู่ 2 ตำบลโคกแย้ อำเภอหนองแค จังหวัดสระบุรี 18130",
      latitude: 14.333333, // เปลี่ยนเป็นพิกัดจริง
      longitude: 100.888888 // เปลี่ยนเป็นพิกัดจริง
    }];
  }

  // 💡 ถ้าไม่ตรงกับเงื่อนไขใดๆ เลย ให้ส่งคืน null เพื่อบอกให้ระบบไปเรียก AI ต่อ
  return null;
}


export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-line-signature") || ""

    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const events = body.events || []

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const replyToken = event.replyToken
        let text = event.message.text.trim()
        const chatId = event.source.userId || event.source.groupId || event.source.roomId;

        // เช็คกรณีเป็น Group/Room
        const sourceType = event.source.type
        const isGroupChat = sourceType === "group" || sourceType === "room"
        let shouldProcess = true

        if (isGroupChat) {
          const lowerText = text.toLowerCase()
          if (lowerText.startsWith("ai/")) {
            text = text.slice(3).trim()
          } else if (lowerText.startsWith("bot/")) {
            text = text.slice(4).trim()
          } else {
            shouldProcess = false
          }
        }

        if (shouldProcess && text.length > 0) {
          
          // ==========================================
          // 🚀 STEP 1: เช็คจากระบบ Rule-based (Keyword) ก่อน
          // ==========================================
          const keywordReplyMessages = handleKeywordMessage(text);

          if (keywordReplyMessages !== null) {
            // ถ้าเจอ Keyword ที่ตั้งไว้ -> ตอบกลับทันที จบการทำงานรอบนี้!
            await replyLineMessage(replyToken, keywordReplyMessages);
            continue; 
          }

          // ==========================================
          // 🤖 STEP 2: ไม่เจอ Keyword -> ส่งให้ AI (Gemini) คิด
          // ==========================================
          if (chatId) {
            await startLoadingAnimation(chatId); // โชว์ ... ให้รู้ว่า AI กำลังค้นหา
          }

          try {
            // 🔎 ค้นหา RAG (Vector Search)
            const searchResults = await searchDocuments(text, 3)
            const context = searchResults.length > 0 
              ? searchResults.map((doc) => `- ${doc.content}`).join("\n") 
              : "- ไม่มีข้อมูลเพิ่มเติมจากฐานข้อมูลเอกสาร -";

            // 🧠 เตรียม Prompt (ใช้ SYSTEM_CORE_KNOWLEDGE จากโค้ดก่อนหน้า)
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
  
  [ข้อความจากผู้ใช้]: ${text}`;

            const aiResponseText = await getGeminiResponse(finalPrompt)

            // ✅ ส่งคำตอบจาก AI กลับไป
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
      // ... (จัดการ sticker, image ตามโค้ดเดิม) ...
    }

    return NextResponse.json({ status: "success" }, { status: 200 })

  } catch (error) {
    console.error("Webhook Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}