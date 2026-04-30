import { NextResponse } from "next/server"
import { getGeminiResponse } from "@/lib/ai/gemini"
import { searchDocuments } from "@/lib/ai/vector-search"
import { SYSTEM_CORE_KNOWLEDGE } from "@/lib/ai/knonwledgeSystem"
import { prisma } from "@/lib/prisma"
import { replyLineMessage, startLoadingAnimation, verifySignature } from "@/lib/line-webhook/line"
import { getLineMessageContent } from "@/lib/line-webhook/getFile"
import { processTyphoonOCR } from "@/lib/line-webhook/typhoon"
import { ensureUserProfile } from "@/lib/line-webhook/action_profile"


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