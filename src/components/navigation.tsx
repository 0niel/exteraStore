"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	Activity,
	Grid3X3,
	Heart,
	Home,
	LogOut,
	Menu,
	Package,
	Plus,
	Search,
	Settings,
	Sparkles,
	User,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { TelegramIcon } from "~/components/icons/telegram-icon";
import { LanguageSwitcher } from "~/components/language-switcher";
import { SearchDialog } from "~/components/search-dialog";
import { ThemeToggle } from "~/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { cn } from "~/lib/utils";
import { TelegramLoginButton } from "./auth/telegram-login";

type NavigationProps = {
	telegramBotUsername?: string;
};

function LogoMark({ size = "size-9" }: { size?: string }) {
	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center rounded-xl bg-linear-to-b from-primary to-[color-mix(in_oklch,var(--primary)_82%,black)] shadow-lg shadow-primary/30",
				size,
			)}
		>
			<span className="font-bold text-primary-foreground text-sm">eS</span>
		</div>
	);
}

export function Navigation({ telegramBotUsername }: NavigationProps) {
	const resolvedBotUsername =
		telegramBotUsername ?? process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const pathname = usePathname();
	const { data: session } = useSession();
	const reduceMotion = useReducedMotion();
	const t = useTranslations("Navigation");

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 8);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	const navigation = [
		{ name: t("home"), href: "/", icon: Home },
		{ name: t("pulse"), href: "/pulse", icon: Activity },
		{ name: t("plugins"), href: "/plugins", icon: Package },
		{ name: t("collections"), href: "/collections", icon: Sparkles },
		{ name: t("categories"), href: "/categories", icon: Grid3X3 },
		{ name: t("developers"), href: "/developers", icon: Users },
	];

	const accountLinks = [
		{ name: t("profile"), href: "/profile", icon: User },
		{ name: t("favorites"), href: "/favorites", icon: Heart },
		{ name: t("my_plugins"), href: "/my-plugins", icon: Settings },
	];

	const handleSignOut = () => {
		signOut({ callbackUrl: "/" });
	};

	return (
		<header
			className={cn(
				"sticky top-0 z-50 w-full border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color,box-shadow] duration-300",
				scrolled
					? "glass shadow-soft"
					: "border-transparent bg-background/95 supports-[backdrop-filter]:bg-background/80",
			)}
		>
			<div className="container mx-auto px-3 sm:px-4">
				<div className="flex h-16 items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-6">
						<Link
							href="/"
							className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
							aria-label="exteraStore"
						>
							<LogoMark />
							<span className="hidden font-bold text-xl tracking-tight sm:block">
								exteraStore
							</span>
						</Link>

						<nav className="hidden items-center gap-5 xl:flex">
							{navigation.map((item) => {
								const active = pathname === item.href;
								return (
									<Link
										key={item.name}
										href={item.href}
										aria-current={active ? "page" : undefined}
										className={cn(
											"relative flex min-h-11 items-center font-medium text-sm transition-colors hover:text-primary",
											active ? "text-primary" : "text-muted-foreground",
										)}
									>
										{item.name}
										{active &&
											(reduceMotion ? (
												<span className="absolute inset-x-0 bottom-2 h-0.5 rounded-full bg-primary" />
											) : (
												<motion.span
													layoutId="nav-underline"
													className="absolute inset-x-0 bottom-2 h-0.5 rounded-full bg-primary shadow-[0_0_8px] shadow-primary/60"
													transition={{
														type: "spring",
														stiffness: 500,
														damping: 35,
													}}
												/>
											))}
									</Link>
								);
							})}
						</nav>
					</div>

					<div className="mx-4 hidden max-w-md flex-1 lg:flex">
						<SearchDialog
							className="w-full justify-start text-xs sm:text-sm"
							placeholder={t("search_placeholder")}
						/>
					</div>

					<div className="flex shrink-0 items-center gap-1 sm:gap-2">
						<SearchDialog
							isMobile
							trigger={
								<Button
									variant="ghost"
									size="icon"
									className="lg:hidden"
									aria-label={t("search_placeholder")}
								>
									<Search className="h-4 w-4" />
								</Button>
							}
						/>

						{session?.user ? (
							<>
								<Button asChild size="sm" className="hidden sm:flex">
									<Link href="/upload">
										<Plus className="mr-1 h-4 w-4" />
										<span>{t("upload_plugin")}</span>
									</Link>
								</Button>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											size="icon"
											className="relative rounded-full p-0"
											aria-label={session.user.name || t("profile")}
										>
											<Avatar className="size-9">
												<AvatarImage
													src={session.user.image || undefined}
													alt={session.user.name || ""}
												/>
												<AvatarFallback>
													{session.user.name?.slice(0, 2).toUpperCase() || "??"}
												</AvatarFallback>
											</Avatar>
											{session.user.telegramUsername && (
												<Badge
													variant="secondary"
													className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center p-0 sm:h-4 sm:w-4"
												>
													<TelegramIcon className="h-2 w-2" />
												</Badge>
											)}
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent className="w-56" align="end" forceMount>
										<DropdownMenuLabel className="font-normal">
											<div className="flex flex-col space-y-1">
												<p className="font-medium text-sm leading-none">
													{session.user.name}
												</p>
												<p className="text-muted-foreground text-xs leading-none">
													{session.user.email}
												</p>
												{session.user.telegramUsername && (
													<p className="text-primary text-xs leading-none">
														@{session.user.telegramUsername}
													</p>
												)}
											</div>
										</DropdownMenuLabel>
										<DropdownMenuSeparator />
										{accountLinks.map((item) => (
											<DropdownMenuItem key={item.href} asChild>
												<Link href={item.href}>
													<item.icon className="mr-2 h-4 w-4" />
													<span>{item.name}</span>
												</Link>
											</DropdownMenuItem>
										))}
										<DropdownMenuItem asChild className="sm:hidden">
											<Link href="/upload">
												<Plus className="mr-2 h-4 w-4" />
												<span>{t("upload_plugin")}</span>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem onClick={handleSignOut}>
											<LogOut className="mr-2 h-4 w-4" />
											<span>{t("sign_out")}</span>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</>
						) : (
							<TelegramLoginButton botUsername={resolvedBotUsername} />
						)}

						<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
							<SheetTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="xl:hidden"
									aria-label={t("open_menu")}
								>
									<Menu className="h-5 w-5" />
								</Button>
							</SheetTrigger>
							<SheetContent
								side="right"
								className="flex h-full w-[min(100%,24rem)] flex-col p-0 pb-[env(safe-area-inset-bottom)]"
							>
								<div className="relative flex min-h-16 items-center overflow-hidden border-b px-4">
									<div className="dot-grid absolute inset-0 -z-10" />
									<div className="flex items-center gap-2">
										<LogoMark />
										<span className="font-bold text-lg tracking-tight">
											exteraStore
										</span>
									</div>
								</div>

								<div className="flex min-h-0 flex-1 flex-col">
									<div className="border-b p-4">
										<SearchDialog
											isMobile
											className="h-11 w-full justify-start"
											placeholder={t("search_placeholder")}
										/>
									</div>

									<div className="flex-1 overflow-y-auto p-4">
										<span className="eyebrow mb-3">{t("menu_section")}</span>
										<nav className="space-y-1">
											{navigation.map((item, index) => {
												const IconComponent = item.icon;
												const active = pathname === item.href;
												return (
													<Link
														key={item.name}
														href={item.href}
														onClick={() => setMobileMenuOpen(false)}
														aria-current={active ? "page" : undefined}
														className={cn(
															"press-scale flex min-h-12 touch-manipulation items-center gap-3 rounded-xl px-2 py-1.5 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
															active
																? "bg-primary/10 text-primary"
																: "hover:bg-primary/5 hover:text-foreground",
														)}
													>
														<span
															className={cn(
																"flex size-10 items-center justify-center rounded-xl transition-colors",
																active
																	? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
																	: "bg-primary/10 text-primary",
															)}
														>
															<IconComponent className="size-4" />
														</span>
														<span className="flex-1">{item.name}</span>
														<span
															className={cn(
																"font-mono text-xs",
																active
																	? "text-primary"
																	: "text-muted-foreground/50",
															)}
														>
															{String(index + 1).padStart(2, "0")}
														</span>
													</Link>
												);
											})}
										</nav>

										{session?.user && (
											<div className="mt-6 border-t pt-4">
												<Button asChild className="w-full">
													<Link
														href="/upload"
														onClick={() => setMobileMenuOpen(false)}
													>
														<Plus className="h-4 w-4" />
														{t("upload_plugin")}
													</Link>
												</Button>
											</div>
										)}
									</div>

									<div className="section-band border-b-0 p-4">
										<div className="mb-4 flex items-center justify-between gap-3">
											<span className="eyebrow">{t("account_section")}</span>
											<div className="flex items-center gap-1">
												<ThemeToggle />
												<LanguageSwitcher />
											</div>
										</div>
										{session?.user ? (
											<>
												<div className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-soft">
													<Avatar className="h-8 w-8">
														<AvatarImage
															src={session.user.image || undefined}
															alt={session.user.name || ""}
														/>
														<AvatarFallback className="text-xs">
															{session.user.name?.slice(0, 2).toUpperCase() ||
																"??"}
														</AvatarFallback>
													</Avatar>
													<div className="min-w-0 flex-1">
														<p className="truncate font-medium text-sm">
															{session.user.name}
														</p>
														<p className="truncate text-muted-foreground text-xs">
															{session.user.email}
														</p>
													</div>
													{session.user.telegramUsername && (
														<Badge
															variant="secondary"
															className="flex h-5 w-5 items-center justify-center p-0"
														>
															<TelegramIcon className="h-3 w-3" />
														</Badge>
													)}
												</div>

												<div className="mt-3 space-y-1">
													{accountLinks.map((item) => (
														<Link
															key={item.href}
															href={item.href}
															onClick={() => setMobileMenuOpen(false)}
															className="flex min-h-11 items-center gap-3 rounded-xl px-2 py-1 text-sm transition-colors hover:bg-primary/5 hover:text-foreground"
														>
															<span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
																<item.icon className="size-4" />
															</span>
															<span>{item.name}</span>
														</Link>
													))}
													<button
														type="button"
														onClick={handleSignOut}
														className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1 text-sm transition-colors hover:bg-destructive/5 hover:text-destructive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
													>
														<span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
															<LogOut className="size-4" />
														</span>
														<span>{t("sign_out")}</span>
													</button>
												</div>
											</>
										) : (
											<div className="space-y-3">
												<p className="text-center text-muted-foreground text-sm">
													{t("sign_in_hint")}
												</p>
												<TelegramLoginButton
													botUsername={resolvedBotUsername}
												/>
											</div>
										)}
									</div>
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</div>
		</header>
	);
}
