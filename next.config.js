import "./src/env.js";

import withNextIntl from "next-intl/plugin";

const withNextIntlConfig = withNextIntl("./src/i18n.ts");

const config = {
	reactStrictMode: true,
	poweredByHeader: false,
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Speculation-Rules",
						value: '"/speculation-rules.json"',
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "Permissions-Policy",
						value:
							"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
					},
				],
			},
			...[
				"/api/:path*",
				"/admin/:path*",
				"/auth/:path*",
				"/favorites",
				"/my-plugins/:path*",
				"/profile",
				"/upload",
			].map((source) => ({
				source,
				headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
			})),
		];
	},
	images: {
		qualities: [70, 75],
		minimumCacheTTL: 86400,
		deviceSizes: [360, 390, 430, 640, 750, 828, 1080, 1200, 1600, 1920],
		imageSizes: [32, 40, 48, 64, 80, 96, 128, 256, 384],
		remotePatterns: [
			new URL("https://exteragram-plugins.storage.yandexcloud.net/**"),
			new URL("https://api.dicebear.com/**"),
			new URL("https://t.me/**"),
		],
	},
};

export default withNextIntlConfig(config);
