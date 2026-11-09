import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
const parsedBackend = new URL(backendUrl);
if (!["http:", "https:"].includes(parsedBackend.protocol) || parsedBackend.origin !== backendUrl) {
  throw new Error("BACKEND_URL must be an HTTP(S) origin without credentials or a path");
}
if (process.env.VERCEL_ENV === "production" && (!process.env.BACKEND_URL || parsedBackend.protocol !== "https:")) {
  throw new Error("A production Vercel deployment requires an HTTPS BACKEND_URL");
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ] }];
  },
  async rewrites() {
    return [
      { source: "/api/healthz", destination: `${backendUrl}/healthz` },
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
