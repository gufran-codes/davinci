import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Da Vinci — A little learning, just for you",
    short_name: "Da Vinci",
    description: "A tutor that learns how to teach your child.",
    start_url: "/app",
    display: "standalone",
    background_color: "#f7f8f3",
    theme_color: "#284f3c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
