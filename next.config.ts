import type { NextConfig } from "next";

// JETSTREAM_TARGET=android produces a fully static export that the Android
// shell serves from its assets (see android/ and scripts/build-android-web.sh).
const isAndroid = process.env.JETSTREAM_TARGET === 'android';

const nextConfig: NextConfig = {
  ...(isAndroid
    ? { output: 'export', images: { unoptimized: true }, distDir: '.next-android' }
    : {
        async redirects() {
          return [{ source: '/events', destination: '/destinations', permanent: true }];
        },
      }),
};

export default nextConfig;
