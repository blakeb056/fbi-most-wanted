import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.fbi.gov",
      },
      {
        protocol: "https",
        hostname: "api.fbi.gov",
      },
    ],
  },
};

export default nextConfig;
