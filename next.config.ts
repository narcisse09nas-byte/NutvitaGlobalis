import type { NextConfig } from "next";
const jaasOrigin = "https://8x8.vc";
const academyOrigin = process.env.ACADEMY_ORIGIN?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  experimental: { cpus: 1 },
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }, { protocol: "https", hostname: "**.supabase.co" }] },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      {
        key: "Permissions-Policy",
        value: `camera=(self "${jaasOrigin}"), microphone=(self "${jaasOrigin}"), display-capture=(self "${jaasOrigin}"), geolocation=()`,
      },
    ] }];
  },
  async rewrites() {
    if (!academyOrigin) return [];
    return {
      beforeFiles: [
        { source: "/academy", destination: `${academyOrigin}/academy` },
        { source: "/academy/:path*", destination: `${academyOrigin}/academy/:path*` },
        { source: "/academy-static/:path*", destination: `${academyOrigin}/academy-static/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};
export default nextConfig;
