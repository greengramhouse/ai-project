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

    // 🛠️ กำหนดภาษาสำหรับอธิบายภาพ (สามารถเปลี่ยนเป็น English ได้ตามต้องการ)
    const figureLanguage = "Thai"; 
    
    // 🛠️ อัปเดต Prompt ตามที่ต้องการ
    const promptText = `Extract all text from the image.
Instructions:
- Only return the clean Markdown.
- Do not include any explanation or extra text.
- You must include all information on the page.
Formatting Rules:
- Tables: Render tables using <table>...</table> in clean HTML format.
- Equations: Render equations using LaTeX syntax with inline ($...$) and block ($$...$$).
- Images/Charts/Diagrams: Wrap visual areas in <figure> tags. Describe in ${figureLanguage}.
- Page Numbers: Wrap page numbers in <page_number>...</page_number>.
- Checkboxes: Use ☐ for unchecked and ☑️ for checked boxes.`;

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
              { type: "text", text: promptText },
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

    // 🛠️ FIX: ดักจับและลบข้อความ Prompt Instructions เผื่อโมเดลคายคำสั่งกลับมา
    // 1. ตัดตั้งแต่คำว่า "Extract all text" ไปจนจบรูปแบบ checkbox
    const leakPattern1 = /Extract all text from the image[\s\S]*?☑️ for checked boxes\.?/gi;
    // หมายเหตุ: ปรับอีโมจิใน Regex เล็กน้อยให้ตรงกับ Prompt (☑️)
    extractedText = extractedText.replace(leakPattern1, '').trim();
    
    // 2. ดักอีกชั้น เผื่อโมเดลคายคำสั่งส่วน Instructions: ออกมาแค่บางส่วน
    const leakPattern2 = /Instructions:[\s\S]*?(<\/figure>|- Checkboxes:[\s\S]*?boxes\.)/gi;
    extractedText = extractedText.replace(leakPattern2, '').trim();

    // ลบเศษแท็ก Markdown ออกหากโมเดลใส่ครอบมาให้
    extractedText = extractedText.replace(/^```markdown/gi, '').replace(/```$/gi, '').trim();

    if (!extractedText) {
      return "ดึงข้อความสำเร็จ แต่ไม่พบตัวอักษรในภาพค่ะ";
    }

    return extractedText;
    
  } catch (error) {
    console.error("Typhoon OCR Request Error:", error);
    return "ขออภัยค่ะ เกิดข้อผิดพลาดในการเชื่อมต่อกับระบบอ่านข้อความ (OCR)";
  }
}