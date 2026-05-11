/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  transpilePackages: ['@sitelager/ui', '@sitelager/i18n'],
  env: { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api' },
};
