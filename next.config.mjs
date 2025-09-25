/** @type {import('next').NextConfig} */
const nextConfig = {
  // ESLint のエラーでビルドを落とさない
  eslint: { ignoreDuringBuilds: true },

  // TypeScript の型エラーでも落とさない（暫定）
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
