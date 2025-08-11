"use client";

import {
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
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TelegramIcon } from "~/components/icons/telegram-icon";

import { SearchDialog } from "~/components/search-dialog";
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

export function Navigation() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
	const pathname = usePathname();
	const { data: session } = useSession();
	const t = useTranslations("Navigation");

	const navigation = [
		{ name: t("home"), href: "/", icon: Home },
		{ name: t("plugins"), href: "/plugins", icon: Package },
		{ name: "Подборки", href: "/collections", icon: Sparkles },
		{ name: t("categories"), href: "/categories", icon: Grid3X3 },
		{ name: t("developers"), href: "/developers", icon: Users },
	];

	const handleSignOut = () => {
		signOut({ callbackUrl: "/" });
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto px-2 sm:px-4">
				<div className="flex h-14 items-center justify-between sm:h-16">
					<div className="flex items-center gap-4 sm:gap-8">
						<Link href="/" className="flex items-center gap-1 sm:gap-2">
							<div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary sm:h-8 sm:w-8">
								<span className="font-bold text-primary-foreground text-xs sm:text-sm">
									eS
								</span>
							</div>
							<span className="hidden font-bold text-lg sm:block sm:text-xl">
								exteraStore
							</span>
						</Link>

						<nav className="hidden items-center gap-3 sm:gap-6 md:flex">
							{navigation.map((item) => (
								<Link
									key={item.name}
									href={item.href}
									className={cn(
										"font-medium text-xs transition-colors hover:text-primary sm:text-sm",
										pathname === item.href
											? "text-primary"
											: "text-muted-foreground",
									)}
								>
									{item.name}
								</Link>
							))}
						</nav>
					</div>

					<div className="mx-2 hidden max-w-md flex-1 sm:mx-4 md:mx-8 lg:flex">
						<SearchDialog
							className="w-full justify-start text-xs sm:text-sm"
							placeholder={t("search_placeholder")}
						/>
					</div>

					<div className="flex items-center gap-2 sm:gap-4">
						<SearchDialog
							trigger={
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 lg:hidden"
								>
									<Search className="h-4 w-4" />
								</Button>
							}
						/>

						{session?.user ? (
							<>
								<Button
									asChild
									size="sm"
									className="hidden bg-primary text-primary-foreground hover:bg-primary/90 sm:flex"
								>
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
											className="relative h-7 w-7 rounded-full p-0 sm:h-8 sm:w-8"
										>
											<Avatar className="h-7 w-7 sm:h-8 sm:w-8">
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
													className="-top-1 -right-1 absolute flex h-3 w-3 items-center justify-center p-0 sm:h-4 sm:w-4"
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
							<TelegramLoginButton
								botUsername={process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME}
							/>
						)}

						<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
							<SheetTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 md:hidden"
								>
									<Menu className="h-4 w-4" />
								</Button>
							</SheetTrigger>
							<SheetContent
								side="right"
								className="w-full p-0 sm:w-[85vw] sm:max-w-[400px]"
							>
								{/* Header с логотипом и крестиком */}
								<div className="flex items-center justify-between border-b p-4">
									<div className="flex items-center gap-2">
										<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
											<span className="font-bold text-primary-foreground text-sm">
												eS
											</span>
										</div>
										<span className="font-bold text-lg">exteraStore</span>
									</div>
								</div>

								{/* Основной контент */}
								<div className="flex h-full flex-col">
									{/* Поиск */}
									<div className="border-b p-4">
										<SearchDialog
											className="w-full justify-start"
											placeholder={t("search_placeholder")}
										/>
									</div>

									{/* Навигация */}
									<div className="flex-1 p-4">
										<nav className="space-y-1">
											{navigation.map((item) => {
												const IconComponent = item.icon;
												return (
													<Link
														key={item.name}
														href={item.href}
														onClick={() => setMobileMenuOpen(false)}
														className={cn(
															"flex items-center gap-3 rounded-lg px-3 py-3 font-medium text-sm transition-all duration-200",
															pathname === item.href
																? "bg-primary text-primary-foreground shadow-sm"
																: "hover:bg-accent hover:text-accent-foreground",
														)}
													>
														<IconComponent className="h-4 w-4" />
														{item.name}
													</Link>
												);
											})}
										</nav>

										{/* Кнопка загрузки плагина */}
										{session?.user && (
											<div className="mt-6 border-t pt-4">
												<Link
													href="/upload"
													onClick={() => setMobileMenuOpen(false)}
													className="flex items-center gap-3 rounded-lg bg-primary px-3 py-3 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
												>
													<Plus className="h-4 w-4" />
													{t("upload_plugin")}
												</Link>
											</div>
										)}
									</div>

									{/* Футер с настройками */}
									<div className="border-t bg-muted/30 p-4">

										{/* Информация о пользователе */}
										{session?.user && (
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
