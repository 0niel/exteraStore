"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Activity, Home, Package, Sparkles, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";

export function MobileTabBar() {
	const pathname = usePathname();
	const { data: session } = useSession();
	const reduceMotion = useReducedMotion();
	const t = useTranslations("Navigation");

	if (
		pathname.startsWith("/admin") ||
		pathname.includes("/diff/") ||
		pathname.includes("/manage")
	) {
		return null;
	}

	const tabs = [
		{ name: t("home"), href: "/", icon: Home, exact: true },
		{ name: t("plugins"), href: "/plugins", icon: Package, exact: false },
		{
			name: t("collections"),
			href: "/collections",
			icon: Sparkles,
			exact: false,
		},
		{ name: t("pulse"), href: "/pulse", icon: Activity, exact: false },
		{
			name: t("profile"),
			href: session?.user ? "/profile" : "/favorites",
			icon: User,
			exact: false,
		},
	];

	return (
		<nav
			aria-label={t("home")}
			className="glass fixed inset-x-0 bottom-0 z-50 border-t pb-safe md:hidden"
		>
			<div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
				{tabs.map((tab) => {
					const active = tab.exact
						? pathname === tab.href
						: pathname === tab.href || pathname.startsWith(`${tab.href}/`);
					const Icon = tab.icon;
					const isProfile = tab.href === "/profile" && session?.user;

					return (
						<Link
							key={tab.href}
							href={tab.href}
							aria-current={active ? "page" : undefined}
							className={cn(
								"tap-highlight-none relative flex min-w-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl transition-colors",
								active ? "text-primary" : "text-muted-foreground",
							)}
						>
							{active && (
								<motion.span
									layoutId="mobile-tab-indicator"
									className="absolute bottom-1 size-1 rounded-full bg-primary shadow-[0_0_8px_2px] shadow-primary/50"
									transition={
										reduceMotion
											? { duration: 0 }
											: { type: "spring", stiffness: 500, damping: 35 }
									}
								/>
							)}
							<motion.span
								whileTap={reduceMotion ? undefined : { scale: 0.85 }}
								animate={
									reduceMotion ? undefined : { scale: active ? 1.08 : 1 }
								}
								transition={{ type: "spring", stiffness: 400, damping: 25 }}
								className="flex flex-col items-center gap-0.5"
							>
								{isProfile ? (
									<Avatar
										className={cn(
											"size-6 border",
											active
												? "border-primary shadow-[0_0_8px] shadow-primary/40"
												: "border-transparent",
										)}
									>
										<AvatarImage
											src={session.user.image || undefined}
											alt={session.user.name || ""}
										/>
										<AvatarFallback className="text-[9px]">
											{session.user.name?.slice(0, 2).toUpperCase() || "??"}
										</AvatarFallback>
									</Avatar>
								) : (
									<Icon
										className={cn(
											"transition-[width,height]",
											active ? "size-[22px] fill-primary/15" : "size-5",
										)}
										strokeWidth={active ? 2.4 : 2}
									/>
								)}
								<span className="font-medium text-[10px] leading-none">
									{tab.name}
								</span>
							</motion.span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
