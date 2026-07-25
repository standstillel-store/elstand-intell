/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // This project was authored in a sandbox without npm registry access, so
    // `next build` was never run locally. Once you've run `npm run lint`
    // yourself and are happy with it, feel free to flip this back to false.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { webpack }) => {
    // Required by @reown/appkit / WalletConnect (Phase 3) — these packages
    // pull in optional Node-only deps that don't exist in the browser
    // bundle. Without this, `next build` fails on the Wallet Connect pages.
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // @reown/appkit-adapter-wagmi's Coinbase Wallet connector pulls in
    // @coinbase/cdp-sdk, which statically imports "@x402/..." packages
    // (x402 = Coinbase's on-chain payment protocol) that aren't installed —
    // they're optional peers cdp-sdk only needs if its payment features are
    // actually invoked, which nothing in this app does (we only use it for
    // wallet CONNECT, see lib/wallet/verify.ts — no payments wired up
    // anywhere, per the Phase 3 brief). Webpack tries to resolve them at
    // build time regardless and fails with "Module not found".
    //
    // A previous version of this fix listed specific subpaths
    // (@x402/core/client, @x402/evm/exact/client, ...) individually via
    // resolve.alias — that turned out to be incomplete (cdp-sdk imports
    // MORE @x402/* paths than were visible in the first error log,
    // including bare `@x402/evm` with no subpath at all, which then surfaced
    // as a NEW failure on the next build — classic whack-a-mole). IgnorePlugin
    // with a namespace-wide regex is the actual fix: it catches every
    // current AND future @x402/* import in one rule, so there's nothing left
    // to discover one build at a time.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^@x402\//,
      })
    );

    return config;
  },
};

module.exports = nextConfig;
