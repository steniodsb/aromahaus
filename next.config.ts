import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "fngomuacesdhphjfyczj.supabase.co";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
      // Thumbnails dos vídeos do YouTube (seção Nosso canal em /sobre)
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
      { protocol: "https", hostname: "img.youtube.com", pathname: "/vi/**" },
    ],
  },
  async redirects() {
    return [
      // "Nosso canal" agora vive dentro de Quem somos.
      { source: "/videos", destination: "/sobre", permanent: false },
    ];
  },
};

export default nextConfig;
