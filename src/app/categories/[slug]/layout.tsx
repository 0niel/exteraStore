import type { Metadata } from "next";
import { StructuredData } from "~/components/structured-data";
import { absoluteUrl, OPEN_GRAPH_IMAGE, seoDescription } from "~/lib/site";
import { getPublicCategorySeo } from "~/server/seo";

type Props = {
	children: React.ReactNode;
	params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { slug } = await params;
	const category = await getPublicCategorySeo(slug);
	if (!category) {
		return {
			title: "Категория не найдена",
			robots: { index: false, follow: false },
		};
	}

	const description =
		seoDescription(category.description) ||
		`Плагины категории «${category.name}»: ${category.pluginCount} дополнений для exteraGram и exteraless.`;
	return {
		title: { absolute: `${category.name} — плагины · exteraStore` },
		description,
		alternates: { canonical: `/categories/${category.slug}` },
		openGraph: {
			title: `${category.name} — плагины exteraStore`,
			description,
			url: absoluteUrl(`/categories/${category.slug}`),
			images: [OPEN_GRAPH_IMAGE],
		},
	};
}

export default async function CategoryLayout({ children, params }: Props) {
	const { slug } = await params;
	const category = await getPublicCategorySeo(slug);
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
									name: "Категории",
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
