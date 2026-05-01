import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; // พาธนี้ขึ้นอยู่กับโปรเจกต์คุณ

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const user = await prisma.userProfile.findUnique({
    where: { lineUserId: userId },
    select: { firstName: true, lastName: true }
  });

  return NextResponse.json(user || {}); 
}