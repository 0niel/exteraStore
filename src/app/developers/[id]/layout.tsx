import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { StructuredData } from "~/components/structured-data";
import {
	absoluteUrl,
	OPEN_GRAPH_IMAGE,
	seoDescription,
	TWITTER_IMAGE,
} from "~/lib/site";
import { getPublicDeveloperSeo } from "~/server/seo";

type Props = {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { id } = await params;
	const locale = await getLocale();
	const developer = await getPublicDeveloperSeo(id);
	if (!developer) {
		return {
			title: locale === "ru" ? "Разработчик не найден" : "Developer not found",
			robots: { index: false, follow: false },
		};
	}

	const name =
		developer.name ||
		developer.telegramUsername ||
		(locale === "ru" ? "Разработчик" : "Developer");
	const description =
		seoDescription(developer.bio) ||
		(locale === "ru"
			? `${name}: ${developer.pluginCount} плагинов и ${developer.totalDownloads} загрузок в exteraStore.`
			: `${name}: ${developer.pluginCount} plugins and ${developer.totalDownloads} downloads on exteraStore.`);
	const url = absoluteUrl(`/developers/${developer.id}`);
	return {
		title: {
			absolute:
				locale === "ru"
					? `${name} — разработчик · exteraStore`
					: `${name} — developer · exteraStore`,
		},
		description,
		alternates: { canonical: `/developers/${developer.id}` },
		openGraph: {
			title:
				locale === "ru"
					? `${name} — разработчик exteraStore`
					: `${name} — exteraStore developer`,
			description,
			url,
			images: developer.image ? [developer.image] : [OPEN_GRAPH_IMAGE],
		},
		twitter: {
			card: "summary",
			title:
				locale === "ru"
					? `${name} — разработчик exteraStore`
					: `${name} — exteraStore developer`,
			description,
			images: developer.image ? [developer.image] : [TWITTER_IMAGE],
		},
	};
}

export default async function DeveloperLayout({ children, params }: Props) {
	const { id } = await params;
	const locale = await getLocale();
	const developer = await getPublicDeveloperSeo(id);
	if (!developer) return children;
	const name =
		developer.name ||
		developer.telegramUsername ||
		(locale === "ru" ? "Разработчик" : "Developer");
	const url = absoluteUrl(`/developers/${developer.id}`);
	const sameAs = [
		developer.website,
		developer.telegramUsername
			? `https://t.me/${developer.telegramUsername}`
			: null,
		developer.githubUsername
			? `https://github.com/${developer.githubUsername}`
			: null,
	].filter((link): link is string => Boolean(link));

	return (
		<>
			<StructuredData
				data={{
					"@context": "https://schema.org",
					"@graph": [
						{
							"@type": "Person",
							"@id": `${url}#person`,
							name,
							description: seoDescription(developer.bio, 300),
							url,
							image: developer.image || undefined,
							sameAs,
						},
						{
							"@type": "ProfilePage",
							url,
							mainEntity: { "@id": `${url}#person` },
						},
					],
				}}
			/>
			{children}
		</>
	);
}
