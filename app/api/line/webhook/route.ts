import { NextResponse } from "next/server"
import { getGeminiResponse } from "@/lib/ai/gemini"
import { searchDocuments } from "@/lib/ai/vector-search"
import { SYSTEM_CORE_KNOWLEDGE } from "@/lib/ai/knonwledgeSystem"
import { prisma } from "@/lib/prisma"
import { replyLineMessage, startLoadingAnimation, verifySignature } from "@/lib/line-webhook/line"
import { getLineMessageContent } from "@/lib/line-webhook/getFile"
import { processTyphoonASR, processTyphoonOCR } from "@/lib/line-webhook/typhoon"
import { ensureUserProfile } from "@/lib/line-webhook/action_profile"

// ==========================================
// 📝 MESSAGE HANDLERS (แยกการจัดการข้อความ)
// ==========================================

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

// 📌 จัดการกรณีเป็น "ข้อความ"
async function handleTextMessage(event: any, userId: string, chatId: string, replyToken: string) {
  let text = event.message.text.trim();
  const lowerText = text.toLowerCase();

  // 1. จัดการคำสั่ง "ocr"
  if (lowerText === "ocr" && userId) { 
    // 🆕 แก้ปัญหาการใช้งานในกลุ่ม: ตรวจสอบและบันทึกโปรไฟล์ก่อนสร้าง Session เสมอ
    // ป้องกัน Error ฐานข้อมูลกรณีผู้ใช้ยังไม่ได้แอดบอทเป็นเพื่อน
    await ensureUserProfile(userId);

    const expires = new Date(Date.now() + 5 * 60 * 1000); 
    await prisma.ocrSession.create({
      data: { lineUserId: userId, status: "WAITING_FOR_IMAGE", expiresAt: expires }
    });
    return replyLineMessage(replyToken, [{ 
      type: "text", 
      text: "ระบบพร้อมแล้วค่ะ 📸 กรุณาส่งรูปภาพที่ต้องการให้อ่านข้อความมาได้เลยค่ะ (รูปจะหมดอายุใน 5 นาที)" 
    }]);
  }

  // 2. หากพิมพ์ข้อความอื่น ให้ยกเลิกโหมด OCR ที่ค้างอยู่
  if (userId) {
    await prisma.ocrSession.updateMany({
      where: { lineUserId: userId, status: "WAITING_FOR_IMAGE" },
      data: { status: "CANCELLED" }
    });
  }

  // 3. กรองแชทกลุ่ม (ถ้าเป็นกลุ่ม ต้องมีคำนำหน้า ai/ หรือ bot/)
  const isGroupChat = event.source.type === "group" || event.source.type === "room";
  if (isGroupChat) {
    if (lowerText.startsWith("ai/")) {
      text = text.slice(3).trim();
    } else if (lowerText.startsWith("bot/")) {
      text = text.slice(4).trim();
    } else {
      return; // ไม่ได้เรียกบอท ให้จบรอบการทำงานทันที
    }
  }

  if (text.length === 0) return;

  // 4. เช็ค Keyword ก่อนส่งให้ AI
  const keywordReplyMessages = handleKeywordMessage(text);
  if (keywordReplyMessages !== null) {
    return replyLineMessage(replyToken, keywordReplyMessages);
  }

  // 5. ค้นหาข้อมูล RAG และส่งให้ Gemini ประมวลผล
  if (chatId) await startLoadingAnimation(chatId);

  try {
    const searchResults = await searchDocuments(text, 3)
    const context = searchResults.length > 0 
      ? searchResults.map((doc: any) => `- ${doc.content}`).join("\n") 
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

// 📌 จัดการกรณีเป็น "รูปภาพ"
async function handleImageMessage(event: any, userId: string, chatId: string, replyToken: string) {
  if (!userId) return;

  // เช็คว่าผู้ใช้อยู่ในโหมดรอส่งรูปหรือไม่
  const activeSession = await prisma.ocrSession.findFirst({
    where: {
      lineUserId: userId,
      status: "WAITING_FOR_IMAGE",
      expiresAt: { gt: new Date() }
    },
    orderBy: { createdAt: "desc" }
  });

  if (!activeSession) return; // หากไม่ได้สั่ง OCR ไว้ ให้ข้ามรูปนี้ไป

  // อัปเดตสถานะว่าได้รับภาพและเริ่มทำงานแล้ว
  await prisma.ocrSession.update({
    where: { id: activeSession.id },
    data: { status: "COMPLETED" }
  });
  
  await startLoadingAnimation(chatId);
  
  const imageBuffer = await getLineMessageContent(event.message.id);
  if (!imageBuffer) {
    return replyLineMessage(replyToken, [{ type: "text", text: "ขออภัยค่ะ ไม่สามารถดาวน์โหลดรูปภาพจากระบบ LINE ได้" }]);
  }

  // ส่งทำ OCR และตอบกลับ
  const extractedText = await processTyphoonOCR(imageBuffer);
  await replyLineMessage(replyToken, [{ 
    type: "text", 
    text: `📝 ข้อความที่อ่านได้จากรูปภาพ:\n\n${extractedText}` 
  }]);
}

async function handleAudioMessage(event: any, userId: string, chatId: string, replyToken: string) {
  if (!userId) return;

  // เริ่มแสดงแอนิเมชัน Loading แจ้งผู้ใช้ว่าบอทกำลังฟังอยู่
  if (chatId) await startLoadingAnimation(chatId);

  // 1. ดึงไฟล์เสียงจาก LINE (ใช้ฟังก์ชันเดียวกับดึงรูปภาพได้เลย)
  const audioBuffer = await getLineMessageContent(event.message.id);
  if (!audioBuffer) {
    return replyLineMessage(replyToken, [{ 
      type: "text", 
      text: "ขออภัยค่ะ ไม่สามารถดาวน์โหลดไฟล์เสียงจากระบบ LINE ได้" 
    }]);
  }

  // 2. ส่งให้ Typhoon ถอดเสียง
  const transcribedText = await processTyphoonASR(audioBuffer);

  // 3. ตอบกลับข้อความ
  await replyLineMessage(replyToken, [{ 
    type: "text", 
    text: `🎤 ข้อความจากเสียงที่คุณส่งมา:\n\n"${transcribedText}"` 
  }]);
}

// ==========================================
// 🚀 MAIN EVENT ROUTER (กระจายงาน)
// ==========================================
async function processLineEvent(event: any) {
  const userId = event.source.userId; 
  const chatId = event.source.groupId || event.source.roomId || userId;
  const replyToken = event.replyToken;

  // แยกประเภท Event ไปยังฟังก์ชันย่อย
  if (event.type === "follow") {
    // ดึงและบันทึกโปรไฟล์เฉพาะตอนที่ผู้ใช้กดเพิ่มเพื่อน หรือปลดบล็อกเท่านั้น (เพื่อลดภาระการทำงาน)
    if (userId) {
      await ensureUserProfile(userId);
    }
  } else if (event.type === "message") {
    if (event.message.type === "text") {
      await handleTextMessage(event, userId, chatId, replyToken);
    } else if (event.message.type === "image") {
      await handleImageMessage(event, userId, chatId, replyToken);
    }else if (event.message.type === "audio") { // 🆕 เพิ่มสำหรับ ASR
      await handleAudioMessage(event, userId, chatId, replyToken);
    }
  }
}

// ==========================================
// 🌐 WEBHOOK ENDPOINT
// ==========================================
export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get("x-line-signature") || ""

    // เช็คความปลอดภัย
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const body = JSON.parse(rawBody)
    const events = body.events || []

    // วนลูปจัดการแต่ละ Event
    for (const event of events) {
      await processLineEvent(event);
    }

    return NextResponse.json({ status: "success" }, { status: 200 })

  } catch (error) {
    console.error("Webhook Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}