import { NextResponse } from "next/server"
import { getGeminiResponse } from "@/lib/ai/gemini"
import crypto from "crypto"
import { searchDocuments } from "@/lib/ai/vector-search"
import { SYSTEM_CORE_KNOWLEDGE } from "@/lib/ai/knonwledgeSystem"
import { prisma } from "@/lib/prisma"
// เตรียม Environment Variables
const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ""
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ""
const TYPHOON_API_KEY = process.env.TYPHOON_API_KEY || "" 

// ฟังก์ชันตรวจสอบ Signature เพื่อความปลอดภัย
function verifySignature(rawBody: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) return false;
  const hash = crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64")
  return hash === signature
}

// ฟังก์ชันสำหรับดึงข้อมูลโปรไฟล์จาก LINE API
async function getLineUserProfile(userId: string) {
  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` }
    });
    if (response.ok) return await response.json();
  } catch (error) {
    console.error("Error fetching LINE profile:", error);
  }
  return null;
}

// ฟังก์ชันสำหรับบันทึก/อัปเดต UserProfile ลง Database
async function ensureUserProfile(userId: string) {
  try {
    let user = await prisma.userProfile.findUnique({ where: { lineUserId: userId } });
    if (!user) {
      const profile = await getLineUserProfile(userId);
      user = await prisma.userProfile.create({
        data: {
          lineUserId: userId,
          displayName: profile?.displayName || "Unknown User",
          pictureUrl: profile?.pictureUrl || null,
        }
      });
    }
    return user;
  } catch (error) {
    console.error("Database Error (ensureUserProfile):", error);
    return null;
  }
}

// ฟังก์ชันแสดงแอนิเมชันกำลังพิมพ์
async function startLoadingAnimation(chatId: string) {
  try {
    const response = await fetch("https://api.line.me/v2/bot/chat/loading/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ chatId: chatId, loadingSeconds: 10 }),
    });
    if (!response.ok) console.error("LINE Loading Animation Error:", await response.text());
  } catch (error) {
    console.error("Fetch Error (Loading):", error);
  }
}

// ฟังก์ชันส่งข้อความกลับ
async function replyLineMessage(replyToken: string, messages: any[]) {
  try {
    const response = await fetch("https://api.line.me/v2/bot/message/reply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({ replyToken: replyToken, messages: messages }),
    })
    if (!response.ok) console.error("LINE Reply Error:", await response.text())
  } catch (error) {
    console.error("Fetch Error:", error)
  }
}

// ฟังก์ชันโหลดไฟล์ภาพจาก LINE Content API
async function getLineMessageContent(messageId: string): Promise<Buffer | null> {
  try {
    const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
      method: "GET",
      headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` }
    });
    if (!response.ok) throw new Error("Failed to fetch content from LINE");
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Download Content Error:", error);
    return null;
  }
}

// ฟังก์ชันส่งภาพไปให้ Typhoon-OCR ประมวลผล
async function processTyphoonOCR(imageBuffer: Buffer): Promise<string> {
  try {
    if (!TYPHOON_API_KEY) {
      return "ระบบยังไม่ได้ตั้งค่า TYPHOON_API_KEY ค่ะ";
    }

    const TYPHOON_BASE_URL = 'https://api.opentyphoon.ai/v1/chat/completions';
    const TYPHOON_MODEL = 'typhoon-ocr';

    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    const response = await fetch(TYPHOON_BASE_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TYPHOON_API_KEY}`
      },
      body: JSON.stringify({
        model: TYPHOON_MODEL,
        messages: [
          {
            role: "user",
            content: [
              // 🛠️ แก้ไข: บังคับให้ตอบเป็นภาษาไทย และห้ามหลุดข้อความคำสั่งภาษาอังกฤษเด็ดขาด
              { type: "text", text: "กรุณาดึงข้อความจากรูปภาพนี้ออกมาให้ถูกต้อง ตอบกลับมาเป็นเนื้อหาที่อยู่ในภาพเท่านั้น ห้ามแสดงข้อความที่เป็นคำสั่ง (Instructions) ภาษาอังกฤษ หรือคำอธิบายแปลกปลอมเด็ดขาด ให้ตอบผลลัพธ์เป็นภาษาไทย" },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.01 // 🛠️ คงค่านี้ไว้ให้นิ่งที่สุด
      })
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    let extractedText = data.choices[0].message.content.trim(); 

    // 🛠️ FIX: ดักจับและลบข้อความ Prompt Instructions (Prompt Leakage) ภาษาอังกฤษทิ้งทั้งหมดให้เด็ดขาด
    // 1. ตัดตั้งแต่คำว่า "Extract all text" ไปจนจบรูปแบบ checkbox
    const leakPattern1 = /Extract all text from the image[\s\S]*?☑ for checked boxes\.?/gi;
    extractedText = extractedText.replace(leakPattern1, '').trim();
    
    // 2. ดักอีกชั้น เผื่อโมเดลคายคำสั่งส่วน Instructions: ออกมาแค่บางส่วน
    const leakPattern2 = /Instructions:[\s\S]*?(<\/figure>|- Checkboxes:[\s\S]*?boxes\.)/gi;
    extractedText = extractedText.replace(leakPattern2, '').trim();

    // ลบเศษแท็กที่อาจหลงเหลือ
    extractedText = extractedText.replace(/```markdown/gi, '').replace(/```/gi, '').trim();

    if (!extractedText) {
      return "ดึงข้อความสำเร็จ แต่ไม่พบตัวอักษรในภาพค่ะ";
    }

    return extractedText;
    
  } catch (error) {
    console.error("Typhoon OCR Request Error:", error);
    return "ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบอ่านข้อความ (OCR)";
  }
}

// ฟังก์ชันสำหรับจัดการ Keyword โดยเฉพาะ
function handleKeywordMessage(text: string): any[] | null {
  const lowerText = text.toLowerCase()

  if (lowerText === "ติดต่อ" || lowerText === "ติดต่อสอบถาม" || lowerText === "เบอร์โทร") {
    return [{ 
      type: "text", 
      text: "☎️ ติดต่อโรงเรียนชุมชนวัดไทยงาม\n- ฝ่ายธุรการ: 0817410181\n- ห้องวิชาการ: 02-XXX-XXXX\n(ติดต่อได้ในวันและเวลาราชการนะคะ)" 
    }];
  }

  if (lowerText.includes("ขอแบบฟอร์ม") || lowerText.includes("ดาวน์โหลดเอกสาร")) {
    return [{ 
      type: "text", 
      text: "📄 คุณสามารถดาวน์โหลดแบบฟอร์มคำร้องต่างๆ ได้ที่ลิงก์นี้เลยค่ะ:\nhttps://example-school.com/forms" 
    }];
  }

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
      const userId = event.source.userId; 
      const chatId = event.source.groupId || event.source.roomId || userId;
      const replyToken = event.replyToken;

      if (userId) {
        await ensureUserProfile(userId);
      }

      // ==========================================
      // 📝 กรณีผู้ใช้ส่ง "ข้อความ" (Text)
      // ==========================================
      if (event.type === "message" && event.message.type === "text") {
        let text = event.message.text.trim();
        const lowerText = text.toLowerCase();

        if (lowerText === "ocr" && userId) {
          const expires = new Date(Date.now() + 5 * 60 * 1000); 
          
          await prisma.ocrSession.create({
            data: {
              lineUserId: userId,
              status: "WAITING_FOR_IMAGE",
              expiresAt: expires
            }
          });

          await replyLineMessage(replyToken, [{ 
            type: "text", 
            text: "ระบบพร้อมแล้วค่ะ 📸 กรุณาส่งรูปภาพที่ต้องการให้อ่านข้อความมาได้เลยค่ะ (รูปจะหมดอายุใน 5 นาที)" 
          }]);
          continue; 
        }

        if (userId) {
          await prisma.ocrSession.updateMany({
            where: { lineUserId: userId, status: "WAITING_FOR_IMAGE" },
            data: { status: "CANCELLED" }
          });
        }

        const sourceType = event.source.type
        const isGroupChat = sourceType === "group" || sourceType === "room"
        let shouldProcess = true

        if (isGroupChat) {
          if (lowerText.startsWith("ai/")) {
            text = text.slice(3).trim()
          } else if (lowerText.startsWith("bot/")) {
            text = text.slice(4).trim()
          } else {
            shouldProcess = false
          }
        }

        if (shouldProcess && text.length > 0) {
          const keywordReplyMessages = handleKeywordMessage(text);
          if (keywordReplyMessages !== null) {
            await replyLineMessage(replyToken, keywordReplyMessages);
            continue; 
          }

          if (chatId) await startLoadingAnimation(chatId);

          try {
            const searchResults = await searchDocuments(text, 3)
            const context = searchResults.length > 0 
              ? searchResults.map((doc) => `- ${doc.content}`).join("\n") 
              : "- ไม่มีข้อมูลเพิ่มเติมจากฐานข้อมูลเอกสาร -";

            const finalPrompt = `คุณคือ "AI เจ้าหน้าที่ธุรการ" ผู้ช่วยใจดีของโรงเรียนชุมชนวัดไทยงาม
  
[SYSTEM_CORE_KNOWLEDGE: ข้อมูลพื้นฐานที่ต้องรู้]:
${SYSTEM_CORE_KNOWLEDGE}

[CONTEXT: ข้อมูลที่ค้นพบจากเอกสาร]:
${context}

[ข้อความจากผู้ใช้]: ${text}`;

            const aiResponseText = await getGeminiResponse(finalPrompt);
            await replyLineMessage(replyToken, [{ type: "text", text: aiResponseText }]);

          } catch (aiError) {
            console.error("AI Error:", aiError)
            await replyLineMessage(replyToken, [{ 
              type: "text", 
              text: "ขออภัยค่ะ ระบบ AI ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งนะคะ" 
            }])
          }
        }
      }

      // ==========================================
      // 📸 กรณีผู้ใช้ส่ง "รูปภาพ" (Image)
      // ==========================================
      else if (event.type === "message" && event.message.type === "image" && userId) {
        
        const activeSession = await prisma.ocrSession.findFirst({
          where: {
            lineUserId: userId,
            status: "WAITING_FOR_IMAGE",
            expiresAt: { gt: new Date() }
          },
          orderBy: { createdAt: "desc" }
        });

        if (activeSession) {
          await prisma.ocrSession.update({
            where: { id: activeSession.id },
            data: { status: "COMPLETED" }
          });
          
          await startLoadingAnimation(chatId);
          
          const imageBuffer = await getLineMessageContent(event.message.id);
          
          if (!imageBuffer) {
            await replyLineMessage(replyToken, [{ type: "text", text: "ขออภัยค่ะ ไม่สามารถดาวน์โหลดรูปภาพจากระบบ LINE ได้" }]);
            continue;
          }

          const extractedText = await processTyphoonOCR(imageBuffer);

          await replyLineMessage(replyToken, [{ 
            type: "text", 
            text: `📝 ข้อความที่อ่านได้จากรูปภาพ:\n\n${extractedText}` 
          }]);
        }
      }
    }

    return NextResponse.json({ status: "success" }, { status: 200 })

  } catch (error) {
    console.error("Webhook Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}