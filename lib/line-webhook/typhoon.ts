const TYPHOON_API_KEY = process.env.TYPHOON_API_KEY || "" 

// ฟังก์ชันส่งภาพไปให้ Typhoon-OCR ประมวลผล
export async function processTyphoonOCR(imageBuffer: Buffer): Promise<string> {
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