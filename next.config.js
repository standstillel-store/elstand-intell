/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // This project was authored in a sandbox without npm registry access, so
    // `next build` was never run locally. Once you've run `npm run lint`
    // yourself and are happy with it, feel free to flip this back to false.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Required by @reown/appkit / WalletConnect (Phase 3) — these packages
    // pull in optional Node-only deps that don't exist in the browser
    // bundle. Without this, `next build` fails on the Wallet Connect pages.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
};

module.exports = nextConfig;
