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
				],
			},
		];
	},
	images: {
		remotePatterns: [
			new URL("https://exteragram-plugins.storage.yandexcloud.net/**"),
			new URL("https://api.dicebear.com/**"),
			new URL("https://t.me/**"),
		],
	},
};

export default withNextIntlConfig(config);
