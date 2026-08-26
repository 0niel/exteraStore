import type { Metadata } from "next";
import { StructuredData } from "~/components/structured-data";
import { absoluteUrl, OPEN_GRAPH_IMAGE } from "~/lib/site";

const description =
	"Каталог проверенных сообществом плагинов для exteraGram и exteraless с рейтингами, версиями, зависимостями и проверками безопасности.";

export const metadata: Metadata = {
	title: "Каталог плагинов",
	description,
	alternates: { canonical: "/plugins" },
	openGraph: {
		title: "Каталог плагинов для exteraGram и exteraless",
		description,
		url: absoluteUrl("/plugins"),
		images: [OPEN_GRAPH_IMAGE],
	},
};

export default function PluginsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<StructuredData
				data={{
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: "Каталог плагинов exteraStore",
					description,
					url: absoluteUrl("/plugins"),
					isPartOf: { "@id": `${absoluteUrl("/")}#website` },
				}}
			/>
			{children}
		</>
	);
}
