"use client";

import {
	ArrowUpRight,
	ChevronLeft,
	ChevronRight,
	Edit,
	MessageSquare,
	Star,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { UserAvatar } from "~/components/user-avatar";
import { getPaginationItems } from "~/lib/pagination";
import { cn, formatDate } from "~/lib/utils";
import { api } from "~/trpc/react";

interface PluginReviewListProps {
	pluginId: number;
	pluginSlug: string;
	pluginRating: number;
	pluginRatingCount: number;
	onWriteReview: () => void;
}

export function PluginReviewList({
	pluginId,
	pluginSlug,
	pluginRating,
	pluginRatingCount,
	onWriteReview,
}: PluginReviewListProps) {
	const t = useTranslations("PluginDetailPage");
	const locale = useLocale();
	const { data: session } = useSession();
	const utils = api.useUtils();
	const [page, setPage] = useState(1);
	const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
	const [editingRating, setEditingRating] = useState(5);
	const [editingComment, setEditingComment] = useState("");
	const sectionRef = useRef<HTMLElement | null>(null);

	const { data, refetch } = api.plugins.getReviews.useQuery({
		pluginId,
		page,
		limit: 10,
	});

	const updateReview = api.plugins.updateReview.useMutation({
		onSuccess: () => {
			toast.success(t("review_updated"));
			setEditingReviewId(null);
			void refetch();
			void utils.plugins.getBySlug.invalidate({ slug: pluginSlug });
		},
		onError: (error) => {
			toast.error(t("review_update_error", { error: error.message }));
		},
	});

	const deleteReview = api.plugins.deleteReview.useMutation({
		onSuccess: () => {
			toast.success(t("review_deleted"));
			if (page > 1 && data?.reviews.length === 1) {
				setPage((current) => current - 1);
			} else {
				void refetch();
			}
			void utils.plugins.getBySlug.invalidate({ slug: pluginSlug });
		},
		onError: (error) => {
			toast.error(t("review_delete_error", { error: error.message }));
		},
	});

	const changePage = (nextPage: number) => {
		if (
			nextPage === page ||
			nextPage < 1 ||
			nextPage > (data?.totalPages ?? 1)
		) {
			return;
		}
		setPage(nextPage);
		window.requestAnimationFrame(() => {
			sectionRef.current?.scrollIntoView({ block: "start" });
		});
	};

	return (
		<section ref={sectionRef} className="scroll-mt-24 space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h3 className="font-bold text-2xl tracking-tight">
						{t("community_reviews")}
					</h3>
					<p className="mt-1 text-muted-foreground text-sm">
						{t("reviews_count", { count: data?.totalCount ?? 0 })}
					</p>
				</div>
				<div className="flex items-center gap-2 rounded-2xl bg-warning/10 px-3 py-2">
					<Star className="size-5 fill-warning text-warning" />
					<span className="font-bold text-lg">
						{pluginRatingCount > 0 ? pluginRating.toFixed(1) : "—"}
					</span>
					<span className="text-muted-foreground text-sm">/ 5</span>
				</div>
			</div>

			{data?.reviews.length === 0 ? (
				<div className="rounded-3xl bg-primary/5 p-8 text-center">
					<div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<MessageSquare className="size-7" />
					</div>
					<h4 className="mb-2 font-semibold text-lg">
						{t("no_reviews_title")}
					</h4>
					<p className="mx-auto mb-5 max-w-sm text-muted-foreground text-sm leading-6">
						{t("no_reviews_description")}
					</p>
					<Button onClick={onWriteReview} className="min-h-11">
						<Star className="size-4" />
						{t("write_first_review")}
					</Button>
				</div>
			) : (
				<div className="space-y-3">
					{data?.reviews.map((review) => (
						<article key={review.id} className="rounded-3xl bg-card p-4 sm:p-6">
							<div className="space-y-4">
								<div className="flex flex-wrap items-start justify-between gap-3">
									<Link
										href={`/developers/${review.userId}`}
										prefetch={false}
										className="group/reviewer flex min-w-0 items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										aria-label={t("open_reviewer_profile", {
											name: review.user?.name || t("anonymous_reviewer"),
										})}
									>
										<UserAvatar
											name={review.user?.name}
											src={review.user?.image}
											className="size-12 rounded-2xl"
											fallbackClassName="rounded-2xl text-sm"
										/>
										<span className="min-w-0">
											<span className="flex items-center gap-1.5 truncate font-semibold transition-colors group-hover/reviewer:text-primary">
												{review.user?.name || t("anonymous_reviewer")}
												<ArrowUpRight className="size-3.5 shrink-0" />
											</span>
											<span className="text-muted-foreground text-sm">
												{formatDate(review.createdAt, locale)}
											</span>
										</span>
									</Link>

									<div className="flex items-center gap-2 rounded-2xl bg-warning/10 px-3 py-2">
										<div className="flex" aria-hidden="true">
											{[1, 2, 3, 4, 5].map((star) => (
												<Star
													key={star}
													className={cn(
														"size-4",
														star <= review.rating
															? "fill-warning text-warning"
															: "text-muted-foreground/35",
													)}
												/>
											))}
										</div>
										<span className="font-bold">{review.rating}.0</span>
										<span className="sr-only">
											{t("rating_out_of_five", { rating: review.rating })}
										</span>
									</div>
								</div>

								{review.title && (
									<h4 className="font-semibold text-lg">{review.title}</h4>
								)}

								{editingReviewId === review.id ? (
									<div className="space-y-3 rounded-2xl bg-surface/70 p-3 sm:p-4">
										<div className="flex gap-1">
											{[1, 2, 3, 4, 5].map((star) => (
												<button
													key={star}
													type="button"
													onClick={() => setEditingRating(star)}
													className="tap-highlight-none flex size-11 items-center justify-center rounded-xl bg-background/70"
													aria-label={t("edit_rating_aria", { star })}
												>
													<Star
														className={cn(
															"size-5",
															star <= editingRating
																? "fill-warning text-warning"
																: "text-muted-foreground",
														)}
													/>
												</button>
											))}
										</div>
										<Textarea
											value={editingComment}
											onChange={(event) =>
												setEditingComment(event.target.value)
											}
											rows={3}
											className="resize-none border-0 bg-background/75 text-base"
										/>
										<div className="flex flex-wrap gap-2">
											<Button
												size="sm"
												className="min-h-11"
												onClick={() =>
													updateReview.mutate({
														reviewId: review.id,
														rating: editingRating,
														comment: editingComment,
													})
												}
												disabled={updateReview.isPending}
											>
												{t("save")}
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="min-h-11"
												onClick={() => setEditingReviewId(null)}
											>
												{t("cancel")}
											</Button>
										</div>
									</div>
								) : (
									review.comment && (
										<p className="whitespace-pre-wrap text-base text-foreground/90 leading-7">
											{review.comment}
										</p>
									)
								)}

								{(session?.user?.id === review.userId ||
									session?.user?.role === "admin") && (
									<div className="flex flex-wrap items-center gap-2 pt-1">
										<Button
											variant="outline"
											size="sm"
											className="min-h-11 border-0 bg-surface"
											onClick={() => {
												setEditingReviewId(review.id);
												setEditingRating(review.rating);
												setEditingComment(review.comment ?? "");
											}}
										>
											<Edit className="size-3.5" />
											{t("edit")}
										</Button>
										<Button
											variant="outline"
											size="sm"
											className="min-h-11 border-0 bg-surface text-destructive hover:bg-destructive/10 hover:text-destructive"
											onClick={() => {
												if (confirm(t("confirm_delete_review"))) {
													deleteReview.mutate({ reviewId: review.id });
												}
											}}
										>
											<Trash2 className="size-3.5" />
											{t("delete")}
										</Button>
									</div>
								)}
							</div>
						</article>
					))}
				</div>
			)}

			{data && data.totalPages > 1 && (
				<nav
					className="flex items-center justify-center gap-2 pt-3"
					aria-label={t("reviews_pagination")}
				>
					<Button
						variant="ghost"
						size="icon"
						className="size-11 rounded-full bg-surface"
						disabled={page === 1}
						onClick={() => changePage(page - 1)}
						aria-label={t("previous_reviews_page")}
					>
						<ChevronLeft className="size-4" />
					</Button>
					{getPaginationItems(page, data.totalPages).map((item) =>
						typeof item === "number" ? (
							<button
								key={item}
								type="button"
								onClick={() => changePage(item)}
								aria-current={item === page ? "page" : undefined}
								aria-label={t("review_page", { page: item })}
								className={cn(
									"flex size-11 items-center justify-center rounded-full bg-surface font-semibold text-sm",
									item === page && "bg-primary text-primary-foreground",
								)}
							>
								{item}
							</button>
						) : (
							<span key={item} className="text-muted-foreground">
								…
							</span>
						),
					)}
					<Button
						variant="ghost"
						size="icon"
						className="size-11 rounded-full bg-surface"
						disabled={page === data.totalPages}
						onClick={() => changePage(page + 1)}
						aria-label={t("next_reviews_page")}
					>
						<ChevronRight className="size-4" />
					</Button>
				</nav>
			)}
		</section>
	);
}
