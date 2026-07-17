import type { NextConfig } from "next";

const basePath = "/academy";

const nextConfig: NextConfig = {
  basePath,
  assetPrefix: "/academy-static",
  output: "standalone",
};

export default nextConfig;
