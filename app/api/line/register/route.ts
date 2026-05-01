import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lineUserId, firstName, lastName } = body;

 await prisma.userProfile.upsert({
  where: { lineUserId: lineUserId },
  update: { 
    firstName: firstName, 
    lastName: lastName 
  },
  create: { 
    lineUserId: lineUserId,
    firstName: firstName,
    lastName: lastName,
    // (หากคุณมีฟิลด์บังคับอื่นๆ ใน DB ให้ใส่เพิ่มตรงนี้ด้วย)
  }
});

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}