import type { Metadata } from "next";
import { StructuredData } from "~/components/structured-data";
import {
	absoluteUrl,
	OPEN_GRAPH_IMAGE,
	seoDescription,
	TWITTER_IMAGE,
} from "~/lib/site";
import { safeJsonParse } from "~/lib/utils";
import { getPublicPluginSeo } from "~/server/seo";

type Props = {
	children: React.ReactNode;
	params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const plugin = await getPublicPluginSeo(slug);
	if (!plugin) {
		return {
			title: "Плагин не найден",
			robots: { index: false, follow: false },
		};
	}

	const description =
		seoDescription(plugin.shortDescription || plugin.description) ||
		`Плагин ${plugin.name} в каталоге exteraStore.`;
	const screenshots = safeJsonParse<string[]>(plugin.screenshots ?? "[]", [])
		.filter((image) => image.startsWith("https://"))
		.slice(0, 4);
	const tags = safeJsonParse<string[]>(plugin.tags ?? "[]", []).slice(0, 12);
	const url = absoluteUrl(`/plugins/${plugin.slug}`);

	return {
		title: { absolute: `${plugin.name} — плагин для Telegram · exteraStore` },
		description,
		keywords: [plugin.name, plugin.category, plugin.author, ...tags],
		alternates: { canonical: `/plugins/${plugin.slug}` },
		openGraph: {
			title: `${plugin.name} — плагин для Telegram`,
			description,
			url,
			type: "website",
			images: screenshots.length > 0 ? screenshots : [OPEN_GRAPH_IMAGE],
		},
		twitter: {
			card: "summary_large_image",
			title: `${plugin.name} — exteraStore`,
			description,
			images: screenshots.length > 0 ? screenshots : [TWITTER_IMAGE],
		},
	};
}

export default async function PluginLayout({ children, params }: Props) {
	const { slug } = await params;
	const plugin = await getPublicPluginSeo(slug);
	if (!plugin) return children;

	const url = absoluteUrl(`/plugins/${plugin.slug}`);
	const screenshots = safeJsonParse<string[]>(plugin.screenshots ?? "[]", [])
		.filter((image) => image.startsWith("https://"))
		.slice(0, 8);
	const description = seoDescription(
		plugin.shortDescription || plugin.description,
		300,
	);
	const software = {
		"@type": "SoftwareApplication",
		"@id": `${url}#software`,
		name: plugin.name,
		description,
		url,
		applicationCategory: plugin.category,
		operatingSystem: "Android",
		softwareVersion: plugin.version,
		author: {
			"@type": "Person",
			name: plugin.author,
			url: plugin.authorId
				? absoluteUrl(`/developers/${plugin.authorId}`)
				: undefined,
		},
		image: screenshots,
		screenshot: screenshots,
		offers: {
			"@type": "Offer",
			price: plugin.price,
			priceCurrency: "USD",
			availability: "https://schema.org/InStock",
			url,
		},
		aggregateRating:
			plugin.ratingCount > 0
				? {
						"@type": "AggregateRating",
						ratingValue: plugin.rating,
						ratingCount: plugin.ratingCount,
						bestRating: 5,
						worstRating: 1,
					}
				: undefined,
		interactionStatistic: {
			"@type": "InteractionCounter",
			interactionType: "https://schema.org/DownloadAction",
			userInteractionCount: plugin.downloadCount,
		},
	};
	const breadcrumb = {
		"@type": "BreadcrumbList",
		itemListElement: [
			{
				"@type": "ListItem",
				position: 1,
				name: "Плагины",
				item: absoluteUrl("/plugins"),
			},
			{
				"@type": "ListItem",
				position: 2,
				name: plugin.name,
				item: url,
			},
		],
	};

	return (
		<>
			<StructuredData
				data={{
					"@context": "https://schema.org",
					"@graph": [software, breadcrumb],
				}}
			/>
			{children}
		</>
	);
}
