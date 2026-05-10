/** @type {import('next').NextConfig} */
module.exports = {
  // standalone output: produces .next/standalone/ for minimal Docker runtime images
  output: 'standalone',
  transpilePackages: ['@container-os/ui', '@container-os/i18n'],
  env: { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api' },
};
