import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lineUserId, firstName, lastName } = body;

    // อัปเดตชื่อ-นามสกุล โดยอ้างอิงจาก lineUserId
    await prisma.userProfile.update({
      where: { lineUserId: lineUserId },
      data: { firstName, lastName }
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}