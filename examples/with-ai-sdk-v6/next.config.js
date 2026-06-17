import { withAui } from "@assistant-ui/next";
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@assistant-ui/react", "@assistant-ui/react-ai-sdk"],
  allowedDevOrigins: ["192.168.56.1"],
};

export default withAui(nextConfig);
