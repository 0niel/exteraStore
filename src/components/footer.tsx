"use client";

import { ExternalLink, Heart } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { TelegramIcon } from "~/components/icons/telegram-icon";
import { CompactLanguageSwitcher } from "~/components/language-switcher";
import { CompactThemeToggle } from "~/components/theme-toggle";

function ExternalFooterLink({
	href,
	children,
}: {
	href: string;
	children: React.ReactNode;
}) {
	return (
		<Link
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-primary"
		>
			{children}
			<ExternalLink className="h-3 w-3" />
		</Link>
	);
}

function GithubIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill="currentColor" viewBox="0 0 24 24">
			<path
				fillRule="evenodd"
				d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
				clipRule="evenodd"
			/>
		</svg>
	);
}

export function Footer() {
	const t = useTranslations("Footer");

	return (
		<footer className="relative border-t bg-background pb-[env(safe-area-inset-bottom)] [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center">
			<div className="absolute inset-0 bg-linear-to-t from-primary/5 via-transparent to-transparent" />

			<div className="container relative mx-auto px-4 py-8 lg:py-10">
				<div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
					<div className="space-y-3 lg:col-span-4">
						<div className="flex items-center gap-3">
							<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm">
								<span className="font-bold text-primary-foreground text-sm">
									eS
								</span>
							</div>
							<div className="font-bold text-xl">exteraStore</div>
						</div>

						<p className="max-w-sm text-muted-foreground text-sm leading-relaxed">
							{t("description")}
						</p>

						<div className="flex items-center gap-3">
							<Link
								href="https://t.me/i_am_oniel"
								target="_blank"
								rel="noopener noreferrer"
								className="group"
								aria-label={t("contact_developer")}
							>
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-contrast text-contrast-foreground transition-transform duration-200 group-hover:scale-105">
									<TelegramIcon className="h-5 w-5" />
								</div>
							</Link>
							<Link
								href="https://github.com/0niel/exteraStore"
								target="_blank"
								rel="noopener noreferrer"
								className="group"
								aria-label={t("view_source")}
							>
								<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-contrast text-contrast-foreground transition-transform duration-200 group-hover:scale-105">
									<GithubIcon className="h-5 w-5" />
								</div>
							</Link>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-x-6 gap-y-8 lg:col-span-8 lg:grid-cols-4">
						<div className="space-y-3">
							<h3 className="font-semibold text-sm tracking-wide">
								{t("quick_links")}
							</h3>
							<ul className="space-y-2">
								<li>
									<Link
										href="/plugins"
										className="text-muted-foreground text-sm transition-colors hover:text-primary"
									>
										{t("browse_plugins")}
									</Link>
								</li>
								<li>
									<Link
										href="/categories"
										className="text-muted-foreground text-sm transition-colors hover:text-primary"
									>
										{t("categories")}
									</Link>
								</li>
								<li>
									<Link
										href="/developers"
										className="text-muted-foreground text-sm transition-colors hover:text-primary"
									>
										{t("developers")}
									</Link>
								</li>
								<li>
									<Link
										href="/upload"
										className="text-muted-foreground text-sm transition-colors hover:text-primary"
									>
										{t("upload_plugin")}
									</Link>
								</li>
							</ul>
						</div>

						<div className="space-y-3">
							<h3 className="font-semibold text-sm tracking-wide">
								{t("resources")}
							</h3>
							<ul className="space-y-2">
								<li>
									<ExternalFooterLink href="https://plugins.exteragram.app">
										{t("documentation")}
									</ExternalFooterLink>
								</li>
								<li>
									<ExternalFooterLink href="https://github.com/0niel/exteraStore/issues">
										{t("report_issue")}
									</ExternalFooterLink>
								</li>
								<li>
									<ExternalFooterLink href="https://t.me/exteraForum">
										{t("community")}
									</ExternalFooterLink>
								</li>
							</ul>
						</div>

						<div className="space-y-3">
							<h3 className="font-semibold text-sm tracking-wide">
								{t("legal")}
							</h3>
							<ul className="space-y-2">
								<li>
									<Link
										href="/privacy"
										className="text-muted-foreground text-sm transition-colors hover:text-primary"
									>
										{t("privacy_policy")}
									</Link>
								</li>
								<li>
									<Link
										href="/terms"
										className="text-muted-foreground text-sm transition-colors hover:text-primary"
									>
										{t("terms_of_service")}
									</Link>
								</li>
								<li>
									<Link
										href="/cookies"
										className="text-muted-foreground text-sm transition-colors hover:text-primary"
									>
										{t("cookie_policy")}
									</Link>
								</li>
								<li>
									<Link
										href="/license"
										className="text-muted-foreground text-sm transition-colors hover:text-primary"
									>
										{t("license")}
									</Link>
								</li>
							</ul>
						</div>

						<div className="space-y-3">
							<h3 className="font-semibold text-sm tracking-wide">
								{t("settings")}
							</h3>
							<div className="space-y-3">
								<div>
									<div className="mb-1 text-muted-foreground text-xs uppercase tracking-wide">
										{t("appearance")}
									</div>
									<CompactThemeToggle />
								</div>

								<div>
									<div className="mb-1 text-muted-foreground text-xs uppercase tracking-wide">
										{t("language_setting")}
									</div>
									<CompactLanguageSwitcher />
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-6 border-t pt-4">
					<div className="flex flex-col items-center justify-between gap-3 md:flex-row">
						<div className="text-muted-foreground text-sm">
							© {new Date().getFullYear()} exteraStore. {t("rights_reserved")}
						</div>
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<span>{t("made_with")}</span>
							<Heart className="h-4 w-4 fill-current text-primary" />
							<span>{t("for_telegram_community")}</span>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}
