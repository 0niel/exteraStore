"use client";

import {
	Heart,
	LogOut,
	Menu,
	Plus,
	Search,
	Settings,
	User,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { TelegramIcon } from "~/components/icons/telegram-icon";

import { LanguageSwitcher } from "~/components/language-switcher";
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
		{ name: t("home"), href: "/" },
		{ name: t("plugins"), href: "/plugins" },
		{ name: t("categories"), href: "/categories" },
		{ name: t("developers"), href: "/developers" },
		{ name: t("docs"), href: "/docs" },
	];

	const handleSignOut = () => {
		signOut({ callbackUrl: "/" });
	};

	return (
		<header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="container mx-auto px-4">
				<div className="flex h-16 items-center justify-between">
					<div className="flex items-center gap-8">
						<Link href="/" className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
								<span className="font-bold text-primary-foreground text-sm">
									eS
								</span>
							</div>
							<span className="hidden font-bold text-xl sm:block">
								exteraStore
							</span>
						</Link>

						<nav className="hidden items-center gap-6 md:flex">
							{navigation.map((item) => (
								<Link
									key={item.name}
									href={item.href}
									className={cn(
										"font-medium text-sm transition-colors hover:text-primary",
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

					<div className="mx-8 hidden max-w-md flex-1 lg:flex">
						<SearchDialog
							className="w-full justify-start"
							placeholder={t("search_placeholder")}
						/>
					</div>

					<div className="flex items-center gap-4">
						<SearchDialog
							trigger={
								<Button variant="ghost" size="sm" className="lg:hidden">
									<Search className="h-4 w-4" />
								</Button>
							}
						/>

						<LanguageSwitcher />

						{session?.user ? (
							<>
								<Button
									asChild
									size="sm"
									className="hidden bg-primary text-primary-foreground hover:bg-primary/90 sm:flex"
								>
									<Link href="/upload">
										<Plus className="mr-2 h-4 w-4" />
										{t("upload_plugin")}
									</Link>
								</Button>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="ghost"
											className="relative h-8 w-8 rounded-full"
										>
											<Avatar className="h-8 w-8">
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
													className="-top-1 -right-1 absolute flex h-4 w-4 items-center justify-center p-0"
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
								<Button variant="ghost" size="sm" className="md:hidden">
									<Menu className="h-4 w-4" />
								</Button>
							</SheetTrigger>
							<SheetContent side="right" className="w-[300px] sm:w-[400px]">
								<div className="mt-6 flex flex-col gap-4">
									<SearchDialog
										className="w-full justify-start"
										placeholder={t("search_placeholder")}
									/>

									<div className="flex items-center justify-between">
										<span className="font-medium text-muted-foreground text-sm">
											{t("language")}
										</span>
										<LanguageSwitcher />
									</div>

									<nav className="flex flex-col gap-2">
										{navigation.map((item) => (
											<Link
												key={item.name}
												href={item.href}
												onClick={() => setMobileMenuOpen(false)}
												className={cn(
													"flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm transition-colors",
													pathname === item.href
														? "bg-primary text-primary-foreground"
														: "hover:bg-accent hover:text-accent-foreground",
												)}
											>
												{item.name}
											</Link>
										))}
									</nav>

									{session?.user && (
										<div className="border-t pt-4">
											<Link
												href="/upload"
												onClick={() => setMobileMenuOpen(false)}
												className="flex items-center gap-2 rounded-md px-3 py-2 font-medium text-sm hover:bg-accent hover:text-accent-foreground"
											>
												<Plus className="h-4 w-4" />
												{t("upload_plugin")}
											</Link>
										</div>
									)}
								</div>
							</SheetContent>
						</Sheet>
					</div>
				</div>
			</div>
		</header>
	);
}
