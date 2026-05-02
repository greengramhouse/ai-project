import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // เพิ่มส่วนนี้เพื่ออนุญาตให้ ngrok เข้าถึงระบบนักพัฒนาได้
  allowedDevOrigins: ["a5bf-171-5-174-151.ngrok-free.app"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
