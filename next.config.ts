import type { NextConfig } from "next";
const jitsiDomain = (process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si")
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");
const jitsiOrigin = `https://${jitsiDomain}`;

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
        value: `camera=(self "${jitsiOrigin}"), microphone=(self "${jitsiOrigin}"), display-capture=(self "${jitsiOrigin}"), geolocation=()`,
      },
    ] }];
  },
};
export default nextConfig;
