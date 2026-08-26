import type { MetadataRoute } from "next";
import { SITE_URL } from "~/lib/site";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: "*",
			allow: "/",
			disallow: [
				"/admin/",
				"/api/",
				"/auth/",
				"/favorites",
				"/my-plugins/",
				"/profile",
				"/upload",
			],
		},
		sitemap: `${SITE_URL}/sitemap.xml`,
		host: SITE_URL,
	};
}
