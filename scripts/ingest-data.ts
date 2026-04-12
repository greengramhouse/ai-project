import "dotenv/config";
import { prisma } from "../lib/prisma";
import { generateEmbedding } from "../lib/ai/gemini";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
// ใช้ PDFParse จาก pdf-parse ตามรูปแบบที่คุณต้องการ
import { PDFParse } from "pdf-parse";
import { parse as csvParse } from "csv-parse/sync";

export interface LoadedDocument {
  content: string;
  metadata: {
    source: string;
    type: string;
    pages?: number;
  };
}

/**
 * 🛠️ ฟังก์ชันสำหรับโหลดไฟล์แต่ละประเภท
 */

// อ่านไฟล์ TXT
async function loadTextFile(filePath: string): Promise<LoadedDocument> {
  const content = fs.readFileSync(filePath, "utf-8");
  return {
    content,
    metadata: {
      source: path.basename(filePath),
      type: "txt",
    },
  };
}

// อ่านไฟล์ CSV และแปลงเป็นประโยคเพื่อให้ AI เข้าใจความสัมพันธ์ของข้อมูล
async function loadCSVFile(filePath: string): Promise<LoadedDocument> {
  const content = fs.readFileSync(filePath, "utf-8");
  const records = csvParse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  const naturalTextRows = records.map((row) => {
    return Object.entries(row)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  });

  return {
    content: naturalTextRows.join("\n\n"),
    metadata: {
      source: path.basename(filePath),
      type: "csv",
    },
  };
}

// อ่านไฟล์ PDF ตามรูปแบบที่คุณต้องการ (v2 style)
async function loadPDFFile(filePath: string): Promise<LoadedDocument> {
  const dataBuffer = fs.readFileSync(filePath);
  
  // 1. ส่ง { data: Buffer } เข้าไปใน Constructor
  const parser = new PDFParse({ data: dataBuffer });
  
  try {
    // 2. ใช้ getText() เพื่อดึงเนื้อหาข้อความ
    const textResult = await parser.getText();
    
    // 3. ใช้ getInfo() เพื่อดึงจำนวนหน้า (ใน v2 จะเก็บใน property .total)
    const infoResult = await parser.getInfo();

    return {
      content: textResult.text,
      metadata: {
        source: path.basename(filePath),
        type: "pdf",
        pages: infoResult.total, // เปลี่ยนจาก numpages เป็น total
      },
    };
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw error;
  } finally {
    // 4. สำคัญมากใน v2: ต้องเรียก destroy() เสมอเพื่อคืนหน่วยความจำ
    await parser.destroy();
  }
}

// ฟังก์ชันหลักในการเลือก Loader ตามนามสกุลไฟล์
async function loadDocument(filePath: string): Promise<LoadedDocument> {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".txt": return loadTextFile(filePath);
    case ".csv": return loadCSVFile(filePath);
    case ".pdf": return loadPDFFile(filePath);
    default:
      throw new Error(`ไม่รองรับไฟล์ประเภท: ${ext}`);
  }
}

/**
 * ✂️ ฟังก์ชันแบ่งข้อความเป็นก้อนเล็ก (Chunking)
 */
function splitIntoChunks(text: string, chunkSize: number = 800): string[] {
  const cleanText = text.replace(/\s+/g, " ").replace(/\0/g, "").trim();
  const words = cleanText.split(" ");
  const chunks: string[] = [];
  let currentChunk = "";

  for (const word of words) {
    if ((currentChunk + word).length > chunkSize) {
      chunks.push(currentChunk.trim());
      currentChunk = word + " ";
    } else {
      currentChunk += word + " ";
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

/**
 * 🚀 ฟังก์ชันหลักสำหรับ Ingest ข้อมูล
 */
async function ingest() {
  console.log("🚀 เริ่มต้นกระบวนการนำเข้าเอกสาร (TXT, CSV, PDF)...");

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    console.error("❌ ไม่พบโฟลเดอร์ /data");
    return;
  }

  const files = fs.readdirSync(dataDir).filter(file => 
    [".txt", ".csv", ".pdf"].includes(path.extname(file).toLowerCase())
  );

  for (const fileName of files) {
    console.log(`\n📖 กำลังประมวลผลไฟล์: ${fileName}`);
    const filePath = path.join(dataDir, fileName);
    
    try {
      // 1. โหลดเนื้อหาตามประเภทไฟล์
      const doc = await loadDocument(filePath);
      
      // 2. แบ่งเป็นก้อนเล็กๆ
      const chunks = splitIntoChunks(doc.content, 1000);
      console.log(`✂️ แบ่งได้ ${chunks.length} chunks`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.length < 10) continue;

        // 3. สร้าง Embedding
        const embedding = await generateEmbedding(chunk);
        const embeddingStr = `[${embedding.join(",")}]`;

        // 4. บันทึกลง Neon (PostgreSQL)
        await prisma.$executeRaw`
          INSERT INTO documents (id, content, metadata, embedding, "updatedAt")
          VALUES (
            ${uuidv4()}, 
            ${chunk}, 
            ${JSON.stringify({ 
              ...doc.metadata,
              part: i + 1,
              totalParts: chunks.length 
            })}, 
            ${embeddingStr}::vector, 
            NOW()
          )
        `;
        process.stdout.write(`\r✅ Progress: ${i + 1}/${chunks.length}`);
      }
      console.log(`\n✨ เสร็จสมบูรณ์: ${fileName}`);
    } catch (err) {
      console.error(`\n❌ ผิดพลาดที่ไฟล์ ${fileName}:`, err);
    }
  }
  console.log("\n🏁 จบกระบวนการนำเข้าข้อมูล!");
}

ingest();