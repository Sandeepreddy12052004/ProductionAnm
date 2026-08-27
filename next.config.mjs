/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: true,
  devIndicators: false,
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL || 'https://farm.agasthyanutromilk.com';
    const cleanBackend = backendUrl.replace(/\/+$/, '');
    return [
      {
        source: '/api/:path*',
        destination: `${cleanBackend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

