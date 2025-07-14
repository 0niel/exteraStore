"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { TelegramIcon } from "~/components/icons/telegram-icon";
import { FooterLanguageSwitcher } from "~/components/language-switcher";
import { FooterThemeToggle } from "~/components/theme-toggle";

export function Footer() {
	const t = useTranslations("Footer");

	return (
		<footer className="relative bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800">
			{/* Subtle gradient background */}
			<div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-900/50"></div>
			
			<div className="relative max-w-7xl mx-auto px-6 py-16 lg:px-8">
				{/* Main Content */}
				<div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
					{/* Brand Section - Spans 4 columns */}
					<div className="lg:col-span-4 space-y-6">
						{/* Logo */}
						<div className="flex items-center space-x-3">
							<div className="relative">
								<div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/25 ring-1 ring-red-500/20">
									<span className="text-white font-bold text-lg">eS</span>
								</div>
								<div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 opacity-20 blur"></div>
							</div>
							<div className="text-2xl font-bold tracking-tight bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
								exteraStore
							</div>
						</div>
						
						{/* Description */}
						<p className="text-gray-600 dark:text-gray-400 text-base leading-relaxed max-w-sm">
							{t("description")}
						</p>
						
						{/* Social Links */}
						<div className="flex items-center space-x-4">
							<Link
								href="https://t.me/i_am_oniel"
								target="_blank"
								rel="noopener noreferrer"
								className="group relative"
								aria-label={t("contact_developer")}
							>
								<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-blue-500/25 group-hover:rotate-3">
									<TelegramIcon className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110" />
								</div>
							</Link>
							<Link
								href="https://github.com/0niel/exteraStore"
								target="_blank"
								rel="noopener noreferrer"
								className="group relative"
								aria-label={t("view_source")}
							>
								<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-gray-500/25 group-hover:-rotate-3">
									<svg className="w-6 h-6 text-white transition-transform duration-300 group-hover:scale-110" fill="currentColor" viewBox="0 0 24 24">
										<path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
									</svg>
								</div>
							</Link>
						</div>
					</div>

					{/* Navigation Grid - Spans 8 columns */}
					<div className="lg:col-span-8 grid grid-cols-2 gap-8 md:grid-cols-4">
						{/* Product */}
						<div className="space-y-6">
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide uppercase">
								{t("quick_links")}
							</h3>
							<ul className="space-y-4">
								<li>
									<Link 
										href="/plugins" 
										className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 text-sm"
									>
										{t("browse_plugins")}
									</Link>
								</li>
								<li>
									<Link 
										href="/categories" 
										className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 text-sm"
									>
										{t("categories")}
									</Link>
								</li>
								<li>
									<Link 
										href="/developers" 
										className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 text-sm"
									>
										{t("developers")}
									</Link>
								</li>
								<li>
									<Link 
										href="/upload" 
										className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 text-sm"
									>
										{t("upload_plugin")}
									</Link>
								</li>
							</ul>
						</div>

						{/* Resources */}
						<div className="space-y-6">
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide uppercase">
								{t("resources")}
							</h3>
							<ul className="space-y-4">
								<li>
									<Link 
										href="http://plugins.exteragram.app" 
										target="_blank"
										rel="noopener noreferrer"
										className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 text-sm inline-flex items-center gap-1"
									>
										{t("documentation")}
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
										</svg>
									</Link>
								</li>
								<li>
									<Link 
										href="https://github.com/0niel/exteraStore/issues" 
										target="_blank"
										rel="noopener noreferrer"
										className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 text-sm inline-flex items-center gap-1"
									>
										{t("report_issue")}
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
										</svg>
									</Link>
								</li>
								<li>
									<Link 
										href="https://t.me/exteraForum" 
										target="_blank"
										rel="noopener noreferrer"
										className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 text-sm inline-flex items-center gap-1"
									>
										{t("community")}
										<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
										</svg>
									</Link>
								</li>
							</ul>
						</div>

						{/* Legal */}
						<div className="space-y-6">
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide uppercase">
								{t("legal")}
							</h3>
							<ul className="space-y-4">
								<li>
									<Link 
										href="/privacy" 
										className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 text-sm"
									>
										{t("privacy_policy")}
									</Link>
								</li>
								<li>
									<Link 
										href="/terms" 
										className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 text-sm"
									>
										{t("terms_of_service")}
									</Link>
								</li>
								<li>
									<Link 
										href="/cookies" 
										className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200 text-sm"
									>
										{t("cookie_policy")}
									</Link>
								</li>
							</ul>
						</div>

						{/* Settings */}
						<div className="space-y-6">
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white tracking-wide uppercase">
								{t("settings")}
							</h3>
							<div className="space-y-6">
								{/* Theme Toggle */}
								<div className="space-y-3">
									<div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider font-medium">
										{t("appearance")}
									</div>
									<FooterThemeToggle />
								</div>
								
								{/* Language Switcher */}
								<div className="space-y-3">
									<div className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wider font-medium">
										{t("language_setting")}
									</div>
									<FooterLanguageSwitcher />
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Bottom Section */}
				<div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
					<div className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
						<div className="text-sm text-gray-500 dark:text-gray-400">
							© {new Date().getFullYear()} exteraStore. {t("rights_reserved")}
						</div>
						<div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
							<span>{t("made_with")}</span>
							<span className="text-red-500 animate-pulse">❤️</span>
							<span>{t("for_telegram_community")}</span>
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
} 