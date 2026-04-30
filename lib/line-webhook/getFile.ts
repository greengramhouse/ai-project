const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || ""

// ฟังก์ชันโหลดไฟล์ภาพจาก LINE Content API
export async function getLineMessageContent(messageId: string): Promise<Buffer | null> {
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