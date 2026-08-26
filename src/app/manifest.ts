import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	return {
		name: "exteraStore — плагины для Telegram",
		short_name: "exteraStore",
		description: "Независимый каталог плагинов для exteraGram и exteraless.",
		start_url: "/",
		display: "standalone",
		background_color: "#0b0909",
		theme_color: "#ef233c",
		categories: ["utilities", "productivity", "social"],
		lang: "ru",
		icons: [
			{
				src: "/favicon.svg",
				sizes: "any",
				type: "image/svg+xml",
				purpose: "any",
			},
		],
	};
}
