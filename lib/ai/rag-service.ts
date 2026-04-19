//ไฟลนี้ไม่ได้ใช้ในโปรเจคนี้ แต่เป็นตัวอย่างของ RAG Service ที่สามารถนำไปปรับใช้ได้ในอนาคต

import { prisma } from "../prisma";
import { generateEmbedding } from "./gemini";

export interface RagContext {
  context: string;
  sources: {
    id: string;
    content: string;
    similarity: number;
    metadata: any;
  }[];
}

/**
 * Service สำหรับจัดการ Retrieval Augmented Generation (RAG)
 */
export async function getRagContext(query: string, topK: number = 5): Promise<RagContext> {
  try {
    // 1. แปลงคำถามผู้ใช้เป็น Vector (768 dimensions)
    const embedding = await generateEmbedding(query);
    
    // แปลง array เป็น string format สำหรับ pgvector: "[0.1, 0.2, ...]"
    const embeddingStr = `[${embedding.join(",")}]`;

    // 2. ค้นหาข้อมูลที่เกี่ยวข้องจาก Neon ด้วย Cosine Similarity
    // เราใช้ matchThreshold 0.3 เพื่อกรองข้อมูลที่ไม่ค่อยเกี่ยวข้องออก
    const matchThreshold = 0.3;

    const documents = await prisma.$queryRaw<any[]>`
      SELECT 
        id, 
        content, 
        metadata,
        1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM documents
      WHERE 1 - (embedding <=> ${embeddingStr}::vector) >= ${matchThreshold}
      ORDER BY embedding <=> ${embeddingStr}::vector ASC
      LIMIT ${topK}
    `;

    // 3. รวมเนื้อหาจากเอกสารที่ค้นเจอเพื่อส่งให้ AI เป็นบริบท (Context)
    const context = documents.length > 0
      ? documents
          .map((doc, i) => `[เอกสารอ้างอิงที่ ${i + 1}]\n${doc.content}`)
          .join("\n\n---\n\n")
      : "ไม่พบข้อมูลที่เกี่ยวข้องในฐานความรู้";

    return {
      context,
      sources: documents.map(doc => ({
        id: doc.id,
        content: doc.content,
        similarity: doc.similarity,
        metadata: doc.metadata
      }))
    };

  } catch (error) {
    console.error("RAG Service Error:", error);
    return {
      context: "เกิดข้อผิดพลาดในการดึงข้อมูลบริบท",
      sources: []
    };
  }
}