import "./src/env.js";

import withNextIntl from "next-intl/plugin";

const withNextIntlConfig = withNextIntl("./src/i18n.ts");

/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	poweredByHeader: false,
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "exteragram-plugins.storage.yandexcloud.net",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "api.dicebear.com",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "t.me",
				port: "",
				pathname: "/**",
			},
		],
	},
};

export default withNextIntlConfig(config);
