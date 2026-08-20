"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
	Download,
	ExternalLink,
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
import { DonationRequisitesEditor } from "~/components/donations/donation-requisites-editor";
import type { DonationMethod } from "~/components/donations/donation-widget";
import { DonationWidget } from "~/components/donations/donation-widget";
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
	const [formData, setFormData] = useState({
		name: "",
		bio: "",
		website: "",
		links: [] as CustomLink[],
		donationRequisites: [] as DonationMethod[],
	});

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
			setFormData({
				name: userProfile.name || "",
				bio: userProfile.bio || "",
				website: userProfile.website || "",
				links: safeJsonParse<CustomLink[]>(userProfile.links ?? "", []),
				donationRequisites: safeJsonParse<DonationMethod[]>(
					userProfile.donationRequisites ?? "",
					[],
				),
			});
		}
	}, [userProfile]);

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
		const dataToSend = {
			...formData,
			links: JSON.stringify(formData.links),
			donationRequisites: JSON.stringify(formData.donationRequisites),
		};
		updateProfileMutation.mutate(dataToSend);
	};

	const handleCancel = () => {
		if (userProfile) {
			setFormData({
				name: userProfile.name || "",
				bio: userProfile.bio || "",
				website: userProfile.website || "",
				links: safeJsonParse<CustomLink[]>(userProfile.links ?? "", []),
				donationRequisites: safeJsonParse<DonationMethod[]>(
					userProfile.donationRequisites ?? "",
					[],
				),
			});
		}
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
			value: userProfile?.stats?.averageRating?.toFixed(1) || "0.0",
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
					<motion.div variants={fadeUp} className="mb-6 sm:mb-8">
						<h1 className="mb-2 font-bold text-2xl sm:text-3xl">
							{t("title")}
						</h1>
						<p className="text-muted-foreground">{t("description")}</p>
					</motion.div>

					<motion.div variants={fadeUp}>
						<Tabs defaultValue="profile" className="space-y-6">
							<TabsList className="grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
								<TabsTrigger value="profile" className="min-h-9">
									{t("profile_tab")}
								</TabsTrigger>
								<TabsTrigger value="stats" className="min-h-9">
									{t("stats_tab")}
								</TabsTrigger>
							</TabsList>

							<TabsContent value="profile">
								<Card>
									<CardHeader>
										<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
											<div>
												<CardTitle>{t("profile_info")}</CardTitle>
												<CardDescription>
													{t("profile_info_description")}
												</CardDescription>
											</div>
											{!isEditing ? (
												<Button
													onClick={() => setIsEditing(true)}
													variant="outline"
													className="press-scale w-full sm:w-auto"
												>
													<Settings className="mr-2 h-4 w-4" />
													{t("edit")}
												</Button>
											) : (
												<div className="flex flex-col gap-2 sm:flex-row">
													<Button
														onClick={handleCancel}
														variant="outline"
														className="w-full sm:w-auto"
													>
														{t("cancel")}
													</Button>
													<Button
														onClick={handleSave}
														disabled={updateProfileMutation.isPending}
														className="press-scale w-full sm:w-auto"
													>
														<Save className="mr-2 h-4 w-4" />
														{t("save")}
													</Button>
												</div>
											)}
										</div>
									</CardHeader>

									<CardContent className="space-y-6">
										<div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:gap-6 sm:text-left">
											<Avatar className="h-20 w-20">
												<AvatarImage
													src={session.user.image || undefined}
													alt={session.user.name || ""}
												/>
												<AvatarFallback className="text-lg">
													{session.user.name?.slice(0, 2).toUpperCase() || "??"}
												</AvatarFallback>
											</Avatar>
											<div className="space-y-1">
												<h3 className="font-semibold text-lg">
													{session.user.name || t("anonymous")}
												</h3>
												<p className="break-all text-muted-foreground text-sm">
													{session.user.email}
												</p>
												{session.user.telegramUsername && (
													<p className="text-primary text-sm">
														@{session.user.telegramUsername}
													</p>
												)}
												{userProfile?.isVerified && (
													<Badge variant="secondary">{t("verified")}</Badge>
												)}
											</div>
										</div>

										<Separator />

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
														{formData.links.map((link, index) => (
															<div
																key={index}
																className="flex flex-col gap-2 sm:flex-row"
															>
																<Input
																	placeholder={t("link_title_placeholder")}
																	value={link.title}
																	onChange={(e) =>
																		updateLink(index, "title", e.target.value)
																	}
																	className="min-h-11 flex-1"
																/>
																<div className="flex gap-2">
																	<Input
																		placeholder="https://example.com"
																		type="url"
																		value={link.url}
																		onChange={(e) =>
																			updateLink(index, "url", e.target.value)
																		}
																		className="min-h-11 flex-1"
																	/>
																	<Button
																		variant="outline"
																		size="icon"
																		className="shrink-0"
																		onClick={() => removeLink(index)}
																		aria-label={t("remove_link")}
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																</div>
															</div>
														))}
														<Button
															variant="outline"
															size="sm"
															onClick={addLink}
															className="w-full"
														>
															<Plus className="mr-2 h-4 w-4" />
															{t("add_link")}
														</Button>
													</div>
												) : userLinks.length > 0 ? (
													<div className="mt-2 flex flex-wrap gap-2">
														{userLinks.map((link, index) => (
															<Button
																key={index}
																variant="outline"
																size="sm"
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
							</TabsContent>

							<TabsContent value="stats">
								<motion.div
									initial={reduceMotion ? false : "hidden"}
									animate="show"
									variants={stagger}
									className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
								>
									{stats.map((stat) => (
										<motion.div key={stat.key} variants={fadeUp}>
											<Card className="card-lift h-full">
												<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
													<CardTitle className="font-medium text-sm">
														{t(stat.key)}
													</CardTitle>
													<stat.icon className="h-4 w-4 text-muted-foreground" />
												</CardHeader>
												<CardContent>
													<div className="font-bold text-2xl">{stat.value}</div>
												</CardContent>
											</Card>
										</motion.div>
									))}
								</motion.div>
							</TabsContent>
						</Tabs>
					</motion.div>
				</motion.div>
			</div>
		</div>
	);
}
