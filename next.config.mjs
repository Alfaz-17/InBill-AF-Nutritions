/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only use static HTML export if we are not running as a standard web server
  ...(process.env.IS_WEB === 'true' ? {} : { output: 'export' }),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    return config;
  }
};

export default nextConfig;
