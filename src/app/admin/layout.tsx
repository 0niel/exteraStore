"use client";

import {
	Bot,
	Layers,
	LayoutGrid,
	Lock,
	Package,
	Settings,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { env } from "~/env";
import { cn } from "~/lib/utils";

const ADMINS = (env.NEXT_PUBLIC_INITIAL_ADMINS ?? "i_am_oniel")
	.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

const NAV_SKELETON_KEYS = ["nav-1", "nav-2", "nav-3", "nav-4"];
const CARD_SKELETON_KEYS = [
	"card-1",
	"card-2",
	"card-3",
	"card-4",
	"card-5",
	"card-6",
];

function AdminSkeletonShell() {
	return (
		<div className="bg-background">
			<div className="glass sticky top-0 z-40 border-b">
				<div className="container mx-auto flex h-14 items-center gap-3 px-4">
					<div className="skeleton-shimmer h-5 w-5 shrink-0 rounded-md" />
					<div className="skeleton-shimmer hidden h-4 w-28 rounded-md sm:block" />
					<div className="flex flex-1 items-center gap-2 overflow-hidden">
						{NAV_SKELETON_KEYS.map((key) => (
							<div
								key={key}
								className="skeleton-shimmer h-9 w-24 shrink-0 rounded-lg"
							/>
						))}
					</div>
					<div className="skeleton-shimmer h-9 w-24 shrink-0 rounded-lg" />
				</div>
			</div>
			<div className="container mx-auto space-y-6 px-4 py-8">
				<div className="skeleton-shimmer h-9 w-64 rounded-lg" />
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{CARD_SKELETON_KEYS.map((key) => (
						<div key={key} className="skeleton-shimmer h-40 rounded-xl" />
					))}
				</div>
			</div>
		</div>
	);
}

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const { data: session, status } = useSession();
	const router = useRouter();
	const pathname = usePathname();
	const t = useTranslations("AdminLayout");

	useEffect(() => {
		if (status === "unauthenticated") {
			router.push("/auth/signin");
		}
	}, [status, router]);

	const isAdmin =
		session?.user?.role === "admin" ||
		(session?.user?.telegramUsername &&
			ADMINS.includes(session.user.telegramUsername.toLowerCase()));

	if (status === "loading" || status === "unauthenticated") {
		return <AdminSkeletonShell />;
	}

	if (!isAdmin) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
				<Card className="w-full max-w-md animate-fade-up text-center">
					<CardHeader>
						<div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
							<Lock className="h-6 w-6 text-destructive" />
						</div>
						<CardTitle>{t("access_denied_title")}</CardTitle>
						<CardDescription>{t("access_denied_description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button asChild>
							<Link href="/">
								<LayoutGrid className="h-4 w-4" />
								{t("go_home")}
							</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const navItems = [
		{
			href: "/admin/plugins",
			label: t("plugins"),
			icon: <Package className="h-4 w-4" />,
			active: pathname === "/admin/plugins",
		},
		{
			href: "/admin/users",
			label: t("users"),
			icon: <Users className="h-4 w-4" />,
			active: pathname === "/admin/users",
		},
		{
			href: "/admin/categories",
			label: t("categories"),
			icon: <Layers className="h-4 w-4" />,
			active: pathname === "/admin/categories",
		},
		{
			href: "/admin/bot",
			label: t("bot"),
			icon: <Bot className="h-4 w-4" />,
			active: pathname === "/admin/bot",
		},
	];

	return (
		<div className="bg-background">
			<div className="glass sticky top-0 z-40 border-b">
				<div className="container mx-auto flex h-14 items-center gap-3 px-4">
					<div className="flex shrink-0 items-center gap-2.5">
						<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Settings className="h-4 w-4" />
						</span>
						<span className="hidden font-semibold sm:inline">
							{t("admin_panel")}
						</span>
					</div>
					<nav className="scrollbar-hide flex flex-1 snap-x items-center gap-1.5 overflow-x-auto">
						{navItems.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								aria-current={item.active ? "page" : undefined}
								className={cn(
									"press-scale flex h-10 shrink-0 snap-start items-center gap-2 rounded-full px-4 font-medium text-sm transition-colors",
									item.active
										? "btn-glow bg-primary text-primary-foreground"
										: "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
								)}
							>
								{item.icon}
								{item.label}
							</Link>
						))}
					</nav>
					<Button variant="outline" size="sm" className="shrink-0" asChild>
						<Link href="/">
							<LayoutGrid className="h-4 w-4" />
							<span className="hidden sm:inline">{t("back_to_site")}</span>
						</Link>
					</Button>
				</div>
			</div>
			{children}
		</div>
	);
}
