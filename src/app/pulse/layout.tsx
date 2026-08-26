import type { Metadata } from "next";
import { absoluteUrl, OPEN_GRAPH_IMAGE } from "~/lib/site";

const description =
	"Свежие публикации, обновления, отзывы и активность сообщества плагинов exteraStore.";

export const metadata: Metadata = {
	title: "Пульс сообщества",
	description,
	alternates: { canonical: "/pulse" },
	openGraph: {
		title: "Пульс сообщества exteraStore",
		description,
		url: absoluteUrl("/pulse"),
		images: [OPEN_GRAPH_IMAGE],
	},
};

export default function PulseLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
