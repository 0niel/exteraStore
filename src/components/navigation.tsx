"use client";

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
import { useState } from "react";
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
import { Input } from "~/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import { cn } from "~/lib/utils";
import { TelegramLoginButton } from "./auth/telegram-login";

type NavigationProps = {
	telegramBotUsername?: string;
};

export function Navigation({ telegramBotUsername }: NavigationProps) {
	const resolvedBotUsername =
		telegramBotUsername ?? process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const pathname = usePathname();
	const { data: session } = useSession();
	const t = useTranslations("Navigation");

	const navigation = [
		{ name: t("home"), href: "/", icon: Home },
		{ name: "Пульс", href: "/pulse", icon: Activity },
		{ name: t("plugins"), href: "/plugins", icon: Package },
		{ name: "Подборки", href: "/collections", icon: Sparkles },
		{ name: t("categories"), href: "/categories", icon: Grid3X3 },
		{ name: t("developers"), href: "/developers", icon: Users },
	];

	const handleSignOut = () => {
		signOut({ callbackUrl: "/" });
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
			<div className="container mx-auto px-3 sm:px-4">
				<div className="flex h-16 items-center justify-between gap-2">
					<div className="flex min-w-0 items-center gap-6">
						<Link
							href="/"
							className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
							aria-label="exteraStore"
						>
							<div className="flex size-9 items-center justify-center rounded-xl bg-primary">
								<span className="font-bold text-primary-foreground text-sm">
									eS
								</span>
							</div>
							<span className="hidden font-bold text-xl sm:block">
								exteraStore
							</span>
						</Link>

						<nav className="hidden items-center gap-5 xl:flex">
							{navigation.map((item) => (
								<Link
									key={item.name}
									href={item.href}
									aria-current={pathname === item.href ? "page" : undefined}
									className={cn(
										"flex min-h-11 items-center border-transparent border-b-2 font-medium text-sm transition-colors hover:text-primary",
										pathname === item.href
											? "border-primary text-primary"
											: "text-muted-foreground",
									)}
								>
									{item.name}
								</Link>
							))}
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
										<span className="hidden sm:inline">
											{t("upload_plugin")}
										</span>
										<span className="sm:hidden">Upload</span>
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
													<p className="text-blue-600 text-xs leading-none">
														@{session.user.telegramUsername}
													</p>
												)}
											</div>
										</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuItem asChild>
											<Link href="/profile">
												<User className="mr-2 h-4 w-4" />
												<span>{t("profile")}</span>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link href="/favorites">
												<Heart className="mr-2 h-4 w-4" />
												<span>{t("favorites")}</span>
											</Link>
										</DropdownMenuItem>
										<DropdownMenuItem asChild>
											<Link href="/my-plugins">
												<Settings className="mr-2 h-4 w-4" />
												<span>{t("my_plugins")}</span>
											</Link>
										</DropdownMenuItem>
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
									aria-label="Open navigation menu"
								>
									<Menu className="h-5 w-5" />
								</Button>
							</SheetTrigger>
							<SheetContent
								side="right"
								className="flex h-full w-[min(100%,24rem)] flex-col p-0 pb-[env(safe-area-inset-bottom)]"
							>
								<div className="flex min-h-16 items-center border-b px-4">
									<div className="flex items-center gap-2">
										<div className="flex size-9 items-center justify-center rounded-xl bg-primary">
											<span className="font-bold text-primary-foreground text-sm">
												eS
											</span>
										</div>
										<span className="font-bold text-lg">exteraStore</span>
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
										<nav className="space-y-1">
											{navigation.map((item) => {
												const IconComponent = item.icon;
												const active = pathname === item.href;
												return (
													<Link
														key={item.name}
														href={item.href}
														onClick={() => setMobileMenuOpen(false)}
														aria-current={active ? "page" : undefined}
														className={cn(
															"flex min-h-11 touch-manipulation items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
															active
																? "bg-primary/10 text-primary"
																: "hover:bg-accent hover:text-accent-foreground",
														)}
													>
														<IconComponent className="h-4 w-4" />
														{item.name}
													</Link>
												);
											})}
										</nav>

										{session?.user && (
											<div className="mt-6 border-t pt-4">
												<Link
													href="/upload"
													onClick={() => setMobileMenuOpen(false)}
													className="flex min-h-11 items-center gap-3 rounded-lg bg-primary px-3 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
												>
													<Plus className="h-4 w-4" />
													{t("upload_plugin")}
												</Link>
											</div>
										)}
									</div>

									<div className="border-t bg-muted/30 p-4">
										<div className="mb-4 flex items-center justify-between gap-3">
											<div className="flex items-center gap-1">
												<ThemeToggle />
												<LanguageSwitcher />
											</div>
										</div>
										{session?.user ? (
											<>
												<div className="flex items-center gap-3 rounded-lg border bg-background p-3">
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

												<div className="mt-3 space-y-2">
													<Link
														href="/profile"
														onClick={() => setMobileMenuOpen(false)}
														className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
													>
														<User className="h-4 w-4" />
														<span>{t("profile")}</span>
													</Link>
													<Link
														href="/favorites"
														onClick={() => setMobileMenuOpen(false)}
														className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
													>
														<Heart className="h-4 w-4" />
														<span>{t("favorites")}</span>
													</Link>
													<Link
														href="/my-plugins"
														onClick={() => setMobileMenuOpen(false)}
														className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
													>
														<Settings className="h-4 w-4" />
														<span>{t("my_plugins")}</span>
													</Link>
													<button
														type="button"
														onClick={handleSignOut}
														className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
													>
														<LogOut className="h-4 w-4" />
														<span>{t("sign_out")}</span>
													</button>
												</div>
											</>
										) : (
											<div className="space-y-3">
												<p className="text-center text-muted-foreground text-sm">
													Войдите, чтобы загружать плагины и добавлять их в
													избранное
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
