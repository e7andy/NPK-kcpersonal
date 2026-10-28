import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kcpersonal",
    short_name: "kcpersonal",
    description: "Arbetspass för kanotcentralens sommarjobbare",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f8f7",
    theme_color: "#12313d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
