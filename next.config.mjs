
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Cho phép mọi domain để demo, thực tế nên giới hạn domain supabase
      },
    ],
  },
};

export default nextConfig;
