"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	Activity,
	Bell,
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
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
import { cn, createValidDate } from "~/lib/utils";
import { api } from "~/trpc/react";

function LogoMark({ size = "size-9" }: { size?: string }) {
	return (
		<div
			className={cn(
				"flex shrink-0 items-center justify-center rounded-xl bg-primary",
				size,
			)}
		>
			<span className="font-bold text-primary-foreground text-sm">eS</span>
		</div>
	);
}

function NotificationsBell() {
	const t = useTranslations("Navigation");
	const format = useFormatter();
	const now = useNow({ updateInterval: 60_000 });
	const utils = api.useUtils();
	const knownNotificationIds = useRef<Set<number> | null>(null);

	const { data: notifications } =
		api.telegramNotifications.getNotifications.useQuery(
			{
				page: 1,
				limit: 10,
				unreadOnly: false,
			},
			{
				refetchInterval: 30_000,
				refetchOnWindowFocus: true,
				staleTime: 15_000,
			},
		);

	const markAsRead = api.telegramNotifications.markAsRead.useMutation({
		onSuccess: () => {
			void utils.telegramNotifications.getNotifications.invalidate();
		},
		onError: () => {
			toast.error(t("notifications_read_error"));
		},
	});

	const unreadIds = (notifications ?? [])
		.filter((notification) => !notification.isRead)
		.map((notification) => notification.id);

	useEffect(() => {
		if (!notifications) return;
		const currentIds = new Set(
			notifications.map((notification) => notification.id),
		);
		if (knownNotificationIds.current) {
			const newestUnread = notifications.find(
				(notification) =>
					!notification.isRead &&
					!knownNotificationIds.current?.has(notification.id),
			);
			if (newestUnread) {
				toast.info(newestUnread.title, { description: newestUnread.message });
			}
		}
		knownNotificationIds.current = currentIds;
	}, [notifications]);

	const markOneAsRead = (notificationId: number, isRead: boolean) => {
		if (!isRead) {
			markAsRead.mutate({ notificationIds: [notificationId] });
		}
	};

	const markAllAsRead = () => {
		if (unreadIds.length === 0 || markAsRead.isPending) return;
		markAsRead.mutate(
			{ notificationIds: unreadIds },
			{
				onSuccess: () => toast.success(t("notifications_all_read")),
			},
		);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative min-h-11 min-w-11"
					aria-label={t("notifications")}
				>
					<Bell className="h-4 w-4" />
					{unreadIds.length > 0 && (
						<span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-medium text-[10px] text-primary-foreground">
							{unreadIds.length > 9 ? "9+" : unreadIds.length}
						</span>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				className="w-[min(22rem,calc(100vw-1rem))]"
				align="end"
			>
				<DropdownMenuLabel className="flex items-center justify-between gap-3">
					<span>{t("notifications")}</span>
					{unreadIds.length > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-8 px-2 text-xs"
							onClick={(event) => {
								event.preventDefault();
								markAllAsRead();
							}}
							disabled={markAsRead.isPending}
						>
							{t("notifications_mark_all")}
						</Button>
					)}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{!notifications || notifications.length === 0 ? (
					<div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
						<span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
							<Bell className="size-4" />
						</span>
						<p className="text-muted-foreground text-sm">
							{t("notifications_empty")}
						</p>
					</div>
				) : (
					<div className="max-h-80 overflow-y-auto">
						{notifications.map((notification) =>
							notification.plugin?.slug ? (
								<DropdownMenuItem key={notification.id} asChild>
									<Link
										href={`/plugins/${notification.plugin.slug}`}
										className="flex flex-col items-start gap-1 py-2"
										onClick={() =>
											markOneAsRead(notification.id, notification.isRead)
										}
									>
										<NotificationRow
											title={notification.title}
											message={notification.message}
											time={format.relativeTime(
												createValidDate(notification.createdAt),
												now,
											)}
											isRead={notification.isRead}
										/>
									</Link>
								</DropdownMenuItem>
							) : (
								<DropdownMenuItem
									key={notification.id}
									className="flex flex-col items-start gap-1 py-2"
									onClick={() =>
										markOneAsRead(notification.id, notification.isRead)
									}
								>
									<NotificationRow
										title={notification.title}
										message={notification.message}
										time={format.relativeTime(
											createValidDate(notification.createdAt),
											now,
										)}
										isRead={notification.isRead}
									/>
								</DropdownMenuItem>
							),
						)}
					</div>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function NotificationRow({
	title,
	message,
	time,
	isRead,
}: {
	title: string;
	message: string;
	time: string;
	isRead: boolean;
}) {
	return (
		<div className="flex w-full items-start gap-2">
			{!isRead && (
				<span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm">{title}</p>
				<p className="line-clamp-2 text-muted-foreground text-xs">{message}</p>
				<p className="mt-0.5 text-muted-foreground/70 text-xs">{time}</p>
			</div>
		</div>
	);
}

export function Navigation() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);
	const pathname = usePathname();
	const { data: session } = useSession();
	const reduceMotion = useReducedMotion();
	const t = useTranslations("Navigation");

	useEffect(() => {
		let frameId: number | null = null;
		let current = window.scrollY > 8;
		const syncScrollState = () => {
			frameId = null;
			const next = window.scrollY > 8;
			if (next !== current) {
				current = next;
				setScrolled(next);
			}
		};
		const onScroll = () => {
			if (frameId === null) {
				frameId = window.requestAnimationFrame(syncScrollState);
			}
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
			if (frameId !== null) window.cancelAnimationFrame(frameId);
		};
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
				"sticky top-0 z-50 w-full pt-[env(safe-area-inset-top)] transition-colors duration-300",
				scrolled
					? "glass"
					: "bg-background/95 supports-[backdrop-filter]:bg-background/80",
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

								<NotificationsBell />

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
							<Button
								asChild
								variant="outline"
								className="press-scale hidden min-h-11 border-primary/25 bg-primary/5 text-primary hover:bg-primary/10 sm:inline-flex"
							>
								<Link href="/auth/signin">
									<TelegramIcon className="size-4" />
									{t("sign_in")}
								</Link>
							</Button>
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
								closeLabel={t("close_menu")}
								className="flex h-dvh w-[min(100%,24rem)] flex-col gap-0 border-0 p-0 pb-[env(safe-area-inset-bottom)] shadow-none"
							>
								<div className="relative flex min-h-16 shrink-0 items-center overflow-hidden px-4">
									<div className="dot-grid absolute inset-0 -z-10" />
									<div className="flex items-center gap-2">
										<LogoMark />
										<span className="font-bold text-lg tracking-tight">
											exteraStore
										</span>
									</div>
								</div>

								<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
									<div className="sticky top-0 z-10 bg-background/95 p-4 backdrop-blur-xl">
										<SearchDialog
											isMobile
											className="h-11 w-full justify-start"
											placeholder={t("search_placeholder")}
										/>
									</div>

									<div className="p-4 pb-2">
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

									<div className="mt-2 bg-surface/70 p-4 pb-6">
										<div className="mb-4 flex items-center justify-between gap-3">
											<span className="eyebrow">{t("account_section")}</span>
											<div className="flex items-center gap-1">
												{session?.user && <NotificationsBell />}
												<ThemeToggle />
												<LanguageSwitcher />
											</div>
										</div>
										{session?.user ? (
											<>
												<div className="flex items-center gap-3 rounded-xl bg-card p-3">
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
												<Button asChild className="w-full">
													<Link
														href="/auth/signin"
														onClick={() => setMobileMenuOpen(false)}
													>
														<TelegramIcon className="size-4" />
														{t("sign_in")}
													</Link>
												</Button>
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
