import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: [
    "@nestjs/common",
    "@nestjs/core",
    "@nestjs/platform-fastify",
    "@nestjs/swagger",
  ],
  webpack(config, { isServer }) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@azez-api-source": path.resolve(process.cwd(), "packages/api/src"),
      "class-transformer/storage": "class-transformer/cjs/storage",
    };
    if (isServer) {
      config.externals.push({
        "@nestjs/microservices/microservices-module": "commonjs @nestjs/microservices/microservices-module",
        "@nestjs/websockets/socket-module": "commonjs @nestjs/websockets/socket-module",
      });
    }
    return config;
  },
};

export default nextConfig;
