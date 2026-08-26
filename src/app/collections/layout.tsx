import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Персональные ИИ-подборки",
	description:
		"Персональные подборки плагинов exteraStore для авторизованных пользователей.",
	robots: { index: false, follow: false },
};

export default function CollectionsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
