import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { StructuredData } from "~/components/structured-data";
import { absoluteUrl, OPEN_GRAPH_IMAGE, seoDescription } from "~/lib/site";
import { getPublicCategorySeo } from "~/server/seo";

type Props = {
	children: React.ReactNode;
	params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const locale = (await getLocale()) === "ru" ? "ru" : "en";
	const category = await getPublicCategorySeo(slug, locale);
	if (!category) {
		return {
			title: locale === "ru" ? "Категория не найдена" : "Category not found",
			robots: { index: false, follow: false },
		};
	}

	const description =
		seoDescription(category.description) ||
		(locale === "ru"
			? `Плагины категории «${category.name}»: ${category.pluginCount} дополнений для exteraGram и exteraless.`
			: `${category.name} plugins: ${category.pluginCount} extensions for exteraGram and exteraless.`);
	return {
		title: {
			absolute:
				locale === "ru"
					? `${category.name} — плагины · exteraStore`
					: `${category.name} — plugins · exteraStore`,
		},
		description,
		alternates: { canonical: `/categories/${category.slug}` },
		openGraph: {
			title:
				locale === "ru"
					? `${category.name} — плагины exteraStore`
					: `${category.name} — exteraStore plugins`,
			description,
			url: absoluteUrl(`/categories/${category.slug}`),
			images: [OPEN_GRAPH_IMAGE],
		},
	};
}

export default async function CategoryLayout({ children, params }: Props) {
	const { slug } = await params;
	const locale = (await getLocale()) === "ru" ? "ru" : "en";
	const category = await getPublicCategorySeo(slug, locale);
	if (!category) return children;
	const url = absoluteUrl(`/categories/${category.slug}`);

	return (
		<>
			<StructuredData
				data={{
					"@context": "https://schema.org",
					"@graph": [
						{
							"@type": "CollectionPage",
							name: category.name,
							description: seoDescription(category.description, 300),
							url,
							numberOfItems: category.pluginCount,
						},
						{
							"@type": "BreadcrumbList",
							itemListElement: [
								{
									"@type": "ListItem",
									position: 1,
									name: locale === "ru" ? "Категории" : "Categories",
									item: absoluteUrl("/categories"),
								},
								{
									"@type": "ListItem",
									position: 2,
									name: category.name,
									item: url,
								},
							],
						},
					],
				}}
			/>
			{children}
		</>
	);
}
