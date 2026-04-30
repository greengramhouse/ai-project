const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || ""
const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ""
import crypto from "crypto"


// ฟังก์ชันตรวจสอบ Signature เพื่อความปลอดภัย
export function verifySignature(rawBody: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) return false;
  const hash = crypto
    .createHmac("SHA256", LINE_CHANNEL_SECRET)
    .update(rawBody)
    .digest("base64")
  return hash === signature
}

// ฟังก์ชันสำหรับดึงข้อมูลโปรไฟล์จาก LINE API
export async function getLineUserProfile(userId: string) {
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

// ฟังก์ชันแสดงแอนิเมชันกำลังพิมพ์
export async function startLoadingAnimation(chatId: string) {
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
export async function replyLineMessage(replyToken: string, messages: any[]) {
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