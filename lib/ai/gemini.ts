import { GoogleGenerativeAI } from "@google/generative-ai";
const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

/**

 * ฟังก์ชันสำหรับสร้าง Embedding

 * 🚀 เปลี่ยนมายิง HTTP Request (fetch) โดยตรง เพื่อหลีกเลี่ยงบัคของ SDK

 */

export async function generateEmbedding(text: string): Promise<number[]> {
  // ยิงตรงไปที่ Endpoint มาตรฐานของ Google
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: {
          parts: [{ text: text }],
        },
      }),
    });

    // ถ้ายัง Error อีก เราจะได้เห็นข้อความดิบๆ จากเซิร์ฟเวอร์ Google เลยว่าติดอะไร

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Raw API Error:", errorText);
      throw new Error(`Google API responded with status ${response.status}`);
    }
    const data = await response.json();
    return data.embedding.values;
  } catch (error) {
    console.error("Embedding Error:", error);

    throw error;
  }
}

/**

 * ฟังก์ชันสำหรับการคุย (Chat Completion)

 */

export async function getGeminiResponse(prompt: string, history: any[] = []) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const chat = model.startChat({
    history: history,
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.3,
    },
  });

  const result = await chat.sendMessage(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * ฟังก์ชันสำหรับการคุยแบบค่อยๆ ส่งกลับมา (Streaming)
 */
export async function getGeminiResponseStream(prompt: string, history: any[] = []) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const chat = model.startChat({
    history: history,
    generationConfig: {
      maxOutputTokens: 1000,
      temperature: 0.3,
    },
  });

  // ใช้ sendMessageStream แทน sendMessage
  const result = await chat.sendMessageStream(prompt);
  return result.stream;
}