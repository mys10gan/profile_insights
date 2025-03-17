/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'instagram.com',
      'instagram.fgru4-1.fna.fbcdn.net',
      'scontent.cdninstagram.com',
      'scontent-iad3-1.cdninstagram.com',
      'media.licdn.com',
      'linkedin.com',
      'static.licdn.com'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: '**.licdn.com',
        pathname: '**',
      }
    ]
  }
};

module.exports = nextConfig; 