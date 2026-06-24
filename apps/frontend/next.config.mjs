const { withAui } = await import("@assistant-ui/next");
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@assistant-ui/react", "@assistant-ui/react-ai-sdk"],
  allowedDevOrigins: ["192.168.56.1"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
};

export default withAui(nextConfig);
