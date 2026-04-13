import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/events',
        destination: '/destinations',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
