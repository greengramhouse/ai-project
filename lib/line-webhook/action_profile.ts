import { prisma } from "../prisma";
import { getLineUserProfile } from "./line";

// ฟังก์ชันสำหรับบันทึก/อัปเดต UserProfile ลง Database
export async function ensureUserProfile(userId: string) {
  try {
    let user = await prisma.userProfile.findUnique({ where: { lineUserId: userId } });
    if (!user) {
      const profile = await getLineUserProfile(userId);
      user = await prisma.userProfile.create({
        data: {
          lineUserId: userId,
          displayName: profile?.displayName || "Unknown User",
          pictureUrl: profile?.pictureUrl || null,
        }
      });
    }
    return user;
  } catch (error) {
    console.error("Database Error (ensureUserProfile):", error);
    return null;
  }
}