"use client";

import {
	Bot,
	Layers,
	LayoutGrid,
	Package,
	Settings,
	Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "~/components/ui/button";
import { env } from "~/env";

const ADMINS = (env.NEXT_PUBLIC_INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

export default function AdminLayout({
	children,
}: { children: React.ReactNode }) {
	const { data: session } = useSession();
	const pathname = usePathname();
	const t = useTranslations("AdminLayout");

	const isAdmin =
		session?.user?.role === "admin" ||
		(session?.user?.telegramUsername &&
			ADMINS.includes(session.user.telegramUsername.toLowerCase()));

	if (!session || !isAdmin) {
		return null;
	}

	const navItems = [
		{
			href: "/admin/plugins",
			label: t("plugins"),
			icon: <Package className="mr-2 h-4 w-4" />,
			active: pathname === "/admin/plugins",
		},
		{
			href: "/admin/categories",
			label: t("categories"),
			icon: <Layers className="mr-2 h-4 w-4" />,
			active: pathname === "/admin/categories",
		},
		{
			href: "/admin/bot",
			label: t("bot"),
			icon: <Bot className="mr-2 h-4 w-4" />,
			active: pathname === "/admin/bot",
		},
		// Можно добавить другие разделы админки
	];

	return (
		<div className="bg-background">
			<div className="border-b">
				<div className="container mx-auto flex h-16 items-center px-4">
					<div className="mr-8 flex items-center">
						<Settings className="mr-2 h-5 w-5" />
						<span className="font-semibold">{t("admin_panel")}</span>
					</div>
					<nav className="flex flex-1 items-center space-x-1">
						{navItems.map((item) => (
							<Button
								key={item.href}
								variant={item.active ? "secondary" : "ghost"}
								size="sm"
								className="h-9"
								asChild
							>
								<Link href={item.href}>
									{item.icon}
									{item.label}
								</Link>
							</Button>
						))}
					</nav>
					<div className="ml-auto flex items-center space-x-2">
						<Button variant="outline" size="sm" asChild>
							<Link href="/">
								<LayoutGrid className="mr-2 h-4 w-4" />
								{t("back_to_site")}
							</Link>
						</Button>
					</div>
				</div>
			</div>
			{children}
		</div>
	);
}
