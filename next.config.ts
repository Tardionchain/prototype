import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000", // Default API base URL
    MONGODB_URI: process.env.MONGODB_URI, // Default MongoDB URI
    REDIS_URL: process.env.REDIS_URL, // Default MongoDB URI
  },
  reactStrictMode: true,
};

export default nextConfig;
