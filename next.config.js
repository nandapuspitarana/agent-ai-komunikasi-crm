const { execSync } = require('child_process');

// Build metadata baked into the server bundle and reported by GET /api/version.
// In Docker .git is not available, so pass --build-arg APP_COMMIT=...; the build
// time is always recorded, which proves the running code was built after a deploy.
function gitCommit() {
  try {
    return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BUILD_COMMIT: process.env.APP_COMMIT || gitCommit(),
    BUILD_TIME: process.env.APP_BUILT_AT || new Date().toISOString(),
  },
  devIndicators: {
    buildActivity: false,
  },
  turbopack: {},
  async headers() {
    return [
      {
        // Allow cross-origin requests from any external site for widget APIs
        source: '/api/widget/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        // Allow chat session APIs (for review etc.) cross-origin
        source: '/api/chat/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        // Allow widget.js to be loaded from any external site
        source: '/widget.js',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
}


const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

module.exports = withPWA(nextConfig);
