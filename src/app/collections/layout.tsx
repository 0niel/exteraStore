import type { Metadata } from "next";
import { getLocale } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getLocale();
	return {
		title:
			locale === "ru" ? "Персональные ИИ-подборки" : "Personal AI collections",
		description:
			locale === "ru"
				? "Персональные подборки плагинов exteraStore для авторизованных пользователей."
				: "Personalized exteraStore plugin collections for signed-in users.",
		robots: { index: false, follow: false },
	};
}

export default function CollectionsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return children;
}
