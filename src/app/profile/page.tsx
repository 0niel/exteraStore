"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	ChartNoAxesColumnIncreasing,
	CircleUserRound,
	Download,
	ExternalLink,
	KeyRound,
	Loader2,
	Package,
	Plus,
	Save,
	Settings,
	Star,
	Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DeveloperPlatform } from "~/components/developer-platform";
import { DonationRequisitesEditor } from "~/components/donations/donation-requisites-editor";
import type { DonationMethod } from "~/components/donations/donation-widget";
import { DonationWidget } from "~/components/donations/donation-widget";
import { NotificationSettings } from "~/components/notification-settings";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { safeJsonParse } from "~/lib/utils";
import { api } from "~/trpc/react";

interface CustomLink {
	title: string;
	url: string;
}

interface ProfileFormData {
	name: string;
	bio: string;
	website: string;
	links: CustomLink[];
	donationRequisites: DonationMethod[];
}

interface ProfileSource {
	name?: string | null;
	bio?: string | null;
	website?: string | null;
	links?: string | null;
	donationRequisites?: string | null;
}

function buildFormData(profile: ProfileSource | undefined): ProfileFormData {
	return {
		name: profile?.name || "",
		bio: profile?.bio || "",
		website: profile?.website || "",
		links: safeJsonParse<CustomLink[]>(profile?.links ?? "", []),
		donationRequisites: safeJsonParse<DonationMethod[]>(
			profile?.donationRequisites ?? "",
			[],
		),
	};
}

const fadeUp = {
	hidden: { opacity: 0, y: 12 },
	show: {
		opacity: 1,
		y: 0,
		transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const },
	},
};

const stagger = {
	hidden: {},
	show: { transition: { staggerChildren: 0.07 } },
};

function ProfileSkeleton() {
	return (
		<div className="space-y-6" aria-hidden="true">
			<div className="skeleton-shimmer h-10 w-48 rounded-lg" />
			<Card>
				<CardHeader>
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div className="space-y-2">
							<div className="skeleton-shimmer h-5 w-44 rounded-md" />
							<div className="skeleton-shimmer h-4 w-64 rounded-md" />
						</div>
						<div className="skeleton-shimmer h-11 w-full rounded-lg sm:w-28" />
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
						<div className="skeleton-shimmer h-20 w-20 shrink-0 rounded-full" />
						<div className="w-full space-y-2">
							<div className="skeleton-shimmer mx-auto h-5 w-40 rounded-md sm:mx-0" />
							<div className="skeleton-shimmer mx-auto h-4 w-56 rounded-md sm:mx-0" />
						</div>
					</div>
					<Separator />
					<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
						{[0, 1, 2, 3].map((i) => (
							<div key={i} className="space-y-2">
								<div className="skeleton-shimmer h-4 w-24 rounded-md" />
								<div className="skeleton-shimmer h-9 w-full rounded-lg" />
							</div>
						))}
					</div>
					<div className="space-y-2">
						<div className="skeleton-shimmer h-4 w-32 rounded-md" />
						<div className="skeleton-shimmer h-24 w-full rounded-lg" />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default function ProfilePage() {
	const { data: session } = useSession();
	const router = useRouter();
	const t = useTranslations("Profile");
	const reduceMotion = useReducedMotion();

	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState<ProfileFormData>(() =>
		buildFormData(undefined),
	);

	const { data: userProfile, isLoading } = api.users.getProfile.useQuery(
		undefined,
		{
			enabled: !!session?.user?.id,
		},
	);

	const updateProfileMutation = api.users.updateProfile.useMutation({
		onSuccess: () => {
			toast.success(t("profile_updated"));
			setIsEditing(false);
		},
		onError: () => {
			toast.error(t("update_error"));
		},
	});

	useEffect(() => {
		if (userProfile) {
			setFormData(buildFormData(userProfile));
		}
	}, [userProfile]);

	const isDirty = userProfile
		? JSON.stringify(formData) !== JSON.stringify(buildFormData(userProfile))
		: false;

	if (!session) {
		return (
			<div className="flex min-h-[60dvh] items-center justify-center px-4">
				<Card className="w-full max-w-md animate-scale-in">
					<CardHeader className="text-center">
						<CardTitle>{t("login_required")}</CardTitle>
						<CardDescription>{t("login_required_description")}</CardDescription>
					</CardHeader>
					<CardContent>
						<Button
							onClick={() => router.push("/auth/signin")}
							className="w-full"
						>
							{t("login")}
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const handleSave = () => {
		const cleanLinks = formData.links.filter(
			(link) => link.title.trim() !== "" || link.url.trim() !== "",
		);
		const dataToSend = {
			...formData,
			links: JSON.stringify(cleanLinks),
			donationRequisites: JSON.stringify(formData.donationRequisites),
		};
		updateProfileMutation.mutate(dataToSend);
	};

	const handleCancel = () => {
		setFormData(buildFormData(userProfile));
		setIsEditing(false);
	};

	const addLink = () => {
		setFormData({
			...formData,
			links: [...formData.links, { title: "", url: "" }],
		});
	};

	const updateLink = (index: number, field: "title" | "url", value: string) => {
		const newLinks = [...formData.links];
		if (newLinks[index]) {
			newLinks[index] = { ...newLinks[index], [field]: value };
			setFormData({ ...formData, links: newLinks });
		}
	};

	const removeLink = (index: number) => {
		const newLinks = formData.links.filter((_, i) => i !== index);
		setFormData({ ...formData, links: newLinks });
	};

	if (isLoading) {
		return (
			<div className="bg-background py-6 sm:py-8">
				<div className="container mx-auto max-w-4xl px-4">
					<div className="mb-6 space-y-2 sm:mb-8">
						<div className="skeleton-shimmer h-9 w-40 rounded-lg" />
						<div className="skeleton-shimmer h-5 w-72 max-w-full rounded-md" />
					</div>
					<ProfileSkeleton />
				</div>
			</div>
		);
	}

	const userLinks = safeJsonParse<CustomLink[]>(userProfile?.links ?? "", []);
	const userDonations = safeJsonParse<DonationMethod[]>(
		userProfile?.donationRequisites ?? "",
		[],
	);

	const stats = [
		{
			key: "total_plugins",
			icon: Package,
			value: userProfile?.stats?.totalPlugins || 0,
		},
		{
			key: "total_downloads",
			icon: Download,
			value: userProfile?.stats?.totalDownloads || 0,
		},
		{
			key: "average_rating",
			icon: Star,
			value:
				(userProfile?.stats?.ratingCount ?? 0) > 0
					? Number(userProfile?.stats?.averageRating).toFixed(1)
					: t("not_rated"),
		},
	] as const;

	return (
		<div className="bg-background py-6 sm:py-8">
			<div className="container mx-auto max-w-4xl px-4">
				<motion.div
					initial={reduceMotion ? false : "hidden"}
					animate="show"
					variants={stagger}
				>
					<motion.div
						variants={fadeUp}
						className="relative mb-6 overflow-hidden rounded-2xl bg-surface/70 sm:mb-8"
					>
						<div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary via-primary/50 to-transparent" />
						<div className="dot-grid absolute inset-0" aria-hidden="true" />
						<div
							className="pointer-events-none absolute -top-24 -right-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
							aria-hidden="true"
						/>
						<div className="relative flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:gap-6 sm:p-8 sm:text-left">
							<Avatar className="h-20 w-20 shrink-0 ring-2 ring-primary/40 ring-offset-4 ring-offset-card sm:h-24 sm:w-24">
								<AvatarImage
									src={userProfile?.image || session.user.image || undefined}
									alt={session.user.name || ""}
								/>
								<AvatarFallback className="bg-primary/10 font-semibold text-lg text-primary">
									{session.user.name?.slice(0, 2).toUpperCase() || "??"}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0">
								<span className="eyebrow mb-2 justify-center sm:justify-start">
									{t("title")}
								</span>
								<h1 className="mb-1 truncate font-bold text-2xl tracking-tight sm:text-3xl">
									{session.user.name || t("anonymous")}
								</h1>
								<p className="break-all text-muted-foreground text-sm">
									{session.user.email}
								</p>
								<div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
									{session.user.telegramUsername && (
										<span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-medium font-mono text-primary text-xs">
											@{session.user.telegramUsername}
										</span>
									)}
									{userProfile?.isVerified && (
										<Badge variant="secondary">{t("verified")}</Badge>
									)}
								</div>
							</div>
						</div>
					</motion.div>

					<motion.div variants={fadeUp}>
						<Tabs defaultValue="profile" className="space-y-6">
							<TabsList className="max-w-full">
								<TabsTrigger value="profile" className="px-3 sm:px-4">
									<CircleUserRound />
									{t("profile_tab")}
								</TabsTrigger>
								<TabsTrigger value="stats" className="px-3 sm:px-4">
									<ChartNoAxesColumnIncreasing />
									{t("stats_tab")}
								</TabsTrigger>
								<TabsTrigger value="api" className="px-3 sm:px-4">
									<KeyRound />
									{t("api_tab")}
								</TabsTrigger>
							</TabsList>

							<TabsContent value="profile" className="space-y-6">
								<Card>
									<CardHeader>
										<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
											<div>
												<span className="eyebrow mb-2">
													{t("eyebrow_account")}
												</span>
												<CardTitle>{t("profile_info")}</CardTitle>
												<CardDescription className="mt-1.5">
													{t("profile_info_description")}
												</CardDescription>
											</div>
											{!isEditing ? (
												<Button
													onClick={() => setIsEditing(true)}
													variant="outline"
													className="press-scale min-h-11 w-full sm:w-auto"
												>
													<Settings className="mr-2 h-4 w-4" />
													{t("edit")}
												</Button>
											) : (
												<div className="flex flex-col gap-2 sm:flex-row">
													<Button
														onClick={handleCancel}
														variant="outline"
														disabled={updateProfileMutation.isPending}
														className="min-h-11 w-full sm:w-auto"
													>
														{t("cancel")}
													</Button>
													<Button
														onClick={handleSave}
														disabled={
															updateProfileMutation.isPending || !isDirty
														}
														className="press-scale min-h-11 w-full sm:w-auto"
													>
														{updateProfileMutation.isPending ? (
															<Loader2 className="mr-2 h-4 w-4 animate-spin" />
														) : (
															<Save className="mr-2 h-4 w-4" />
														)}
														{t("save")}
													</Button>
												</div>
											)}
										</div>
									</CardHeader>

									<CardContent className="space-y-6">
										<div className="space-y-6">
											<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
												<div>
													<Label htmlFor="name">{t("display_name")}</Label>
													{isEditing ? (
														<Input
															id="name"
															className="mt-1 min-h-11"
															value={formData.name}
															onChange={(e) =>
																setFormData({
																	...formData,
																	name: e.target.value,
																})
															}
															placeholder={t("display_name_placeholder")}
														/>
													) : null}
													{isEditing ? (
														<p className="mt-1.5 text-muted-foreground text-xs">
															{t("display_name_hint")}
														</p>
													) : (
														<p className="mt-1 text-muted-foreground text-sm">
															{userProfile?.name || t("not_specified")}
														</p>
													)}
												</div>

												<div>
													<Label htmlFor="website">{t("website")}</Label>
													{isEditing ? (
														<Input
															id="website"
															type="url"
															className="mt-1 min-h-11"
															value={formData.website}
															onChange={(e) =>
																setFormData({
																	...formData,
																	website: e.target.value,
																})
															}
															placeholder="https://example.com"
														/>
													) : null}
													{isEditing ? (
														<p className="mt-1.5 text-muted-foreground text-xs">
															{t("website_hint")}
														</p>
													) : userProfile?.website ? (
														<a
															href={userProfile.website}
															target="_blank"
															rel="noopener noreferrer"
															className="mt-1 block break-all text-primary text-sm hover:underline"
														>
															{userProfile.website}
														</a>
													) : (
														<p className="mt-1 text-muted-foreground text-sm">
															{t("not_specified")}
														</p>
													)}
												</div>
											</div>

											<div>
												<Label htmlFor="bio">{t("bio")}</Label>
												{isEditing ? (
													<Textarea
														id="bio"
														className="mt-1"
														value={formData.bio}
														onChange={(e) =>
															setFormData({ ...formData, bio: e.target.value })
														}
														placeholder={t("bio_placeholder")}
														rows={4}
													/>
												) : null}
												{isEditing ? (
													<p className="mt-1.5 text-muted-foreground text-xs">
														{t("bio_hint")}
													</p>
												) : (
													<p className="mt-1 text-muted-foreground text-sm">
														{userProfile?.bio || t("not_specified")}
													</p>
												)}
											</div>

											<div>
												<Label>{t("custom_links")}</Label>
												{isEditing ? (
													<div className="mt-2 space-y-3">
														<AnimatePresence initial={false}>
															{formData.links.map((link, index) => (
																<motion.div
																	key={index}
																	initial={
																		reduceMotion
																			? false
																			: { opacity: 0, y: -6, height: 0 }
																	}
																	animate={{
																		opacity: 1,
																		y: 0,
																		height: "auto",
																	}}
																	exit={
																		reduceMotion
																			? undefined
																			: { opacity: 0, y: -6, height: 0 }
																	}
																	transition={{
																		duration: 0.25,
																		ease: [0.16, 1, 0.3, 1],
																	}}
																	className="overflow-hidden"
																>
																	<div className="flex min-h-11 flex-col gap-2 sm:flex-row">
																		<Input
																			placeholder={t("link_title_placeholder")}
																			value={link.title}
																			onChange={(e) =>
																				updateLink(
																					index,
																					"title",
																					e.target.value,
																				)
																			}
																			className="min-h-11 flex-1"
																		/>
																		<div className="flex gap-2">
																			<Input
																				placeholder="https://example.com"
																				type="url"
																				value={link.url}
																				onChange={(e) =>
																					updateLink(
																						index,
																						"url",
																						e.target.value,
																					)
																				}
																				className="min-h-11 flex-1"
																			/>
																			<Button
																				variant="outline"
																				size="icon"
																				className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
																				onClick={() => removeLink(index)}
																				aria-label={t("remove_link")}
																			>
																				<Trash2 className="h-4 w-4" />
																			</Button>
																		</div>
																	</div>
																</motion.div>
															))}
														</AnimatePresence>
														<Button
															variant="outline"
															size="sm"
															onClick={addLink}
															className="min-h-11 w-full border-dashed"
														>
															<Plus className="mr-2 h-4 w-4" />
															{t("add_link")}
														</Button>
														<p className="text-muted-foreground text-xs">
															{t("links_hint")}
														</p>
													</div>
												) : userLinks.length > 0 ? (
													<div className="mt-2 flex flex-wrap gap-2">
														{userLinks.map((link, index) => (
															<Button
																key={index}
																variant="outline"
																size="sm"
																className="min-h-11"
																asChild
															>
																<a
																	href={link.url}
																	target="_blank"
																	rel="noopener noreferrer"
																>
																	<ExternalLink className="mr-2 h-4 w-4" />
																	{link.title}
																</a>
															</Button>
														))}
													</div>
												) : (
													<p className="mt-1 text-muted-foreground text-sm">
														{t("not_specified")}
													</p>
												)}
											</div>

											<div>
												{isEditing ? (
													<DonationRequisitesEditor
														value={formData.donationRequisites}
														onChange={(next) =>
															setFormData({
																...formData,
																donationRequisites: next,
															})
														}
													/>
												) : userDonations.length > 0 ? (
													<div className="mt-2 space-y-2">
														<Label>{t("donations")}</Label>
														<DonationWidget methods={userDonations} />
													</div>
												) : (
													<div>
														<Label>{t("donations")}</Label>
														<p className="mt-1 text-muted-foreground text-sm">
															{t("not_specified")}
														</p>
													</div>
												)}
											</div>
										</div>
									</CardContent>
								</Card>

								<NotificationSettings />
							</TabsContent>

							<TabsContent value="stats">
								<span className="eyebrow mb-4">{t("eyebrow_stats")}</span>
								<motion.div
									initial={reduceMotion ? false : "hidden"}
									animate="show"
									variants={stagger}
									className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
								>
									{stats.map((stat, index) => (
										<motion.div key={stat.key} variants={fadeUp}>
											<Card className="card-lift relative h-full overflow-hidden">
												<div
													className="dot-grid absolute inset-0"
													aria-hidden="true"
												/>
												<CardContent className="relative flex items-start justify-between gap-4">
													<div>
														<div className="font-mono font-semibold text-muted-foreground text-xs tracking-widest">
															{String(index + 1).padStart(2, "0")}
														</div>
														<div className="mt-2 font-bold font-mono text-3xl tracking-tight">
															{stat.value}
														</div>
														<div className="mt-1 text-muted-foreground text-sm">
															{t(stat.key)}
														</div>
													</div>
													<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
														<stat.icon className="h-5 w-5" />
													</div>
												</CardContent>
											</Card>
										</motion.div>
									))}
								</motion.div>
							</TabsContent>

							<TabsContent value="api">
								<DeveloperPlatform />
							</TabsContent>
						</Tabs>
					</motion.div>
				</motion.div>
			</div>
		</div>
	);
}
