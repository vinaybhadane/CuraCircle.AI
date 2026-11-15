/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        // Keep the opener relationship required by Firebase Google OAuth popups.
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=*, microphone=*' }
      ]
    }
  ]
};

module.exports = nextConfig;
