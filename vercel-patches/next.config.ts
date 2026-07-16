import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: [
    "@azez/api",
    "@nestjs/common",
    "@nestjs/core",
    "@nestjs/platform-fastify",
    "@nestjs/swagger",
  ],
  webpack(config, { isServer }) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "class-transformer/storage": "class-transformer/cjs/storage",
    };
    if (isServer) {
      config.externals.push({
        "@nestjs/microservices/microservices-module":
          "commonjs @nestjs/microservices/microservices-module",
        "@nestjs/websockets/socket-module": "commonjs @nestjs/websockets/socket-module",
      });
    }
    return config;
  },
};

export default nextConfig;
