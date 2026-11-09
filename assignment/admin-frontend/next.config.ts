import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
const adminBackendUrl = (process.env.ADMIN_BACKEND_URL || "http://localhost:3003").replace(/\/$/, "");
for (const [name, value] of [["BACKEND_URL", backendUrl], ["ADMIN_BACKEND_URL", adminBackendUrl]]) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== value) {
    throw new Error(`${name} must be an HTTP(S) origin without credentials or a path`);
  }
  if (process.env.VERCEL_ENV === "production" && (!process.env[name] || url.protocol !== "https:")) {
    throw new Error(`A production Vercel deployment requires an HTTPS ${name}`);
  }
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
      { source: "/api/admin-healthz", destination: `${adminBackendUrl}/healthz` },
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/graphql",
        destination: `${adminBackendUrl}/graphql`,
      },
    ];
  },
};

export default nextConfig;
