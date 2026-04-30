import type { NextConfig } from "next";

const nextConfig: NextConfig = {
// เพิ่มส่วนนี้เพื่ออนุญาตให้ ngrok เข้าถึงระบบนักพัฒนาได้
    allowedDevOrigins: ['d09c-171-5-174-151.ngrok-free.app'],
};

export default nextConfig;
