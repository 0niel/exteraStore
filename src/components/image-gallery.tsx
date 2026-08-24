"use client";

import { Shield, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

interface ImageGalleryProps {
	images: string[];
	alt: string;
	className?: string;
	category?: string;
	verified?: boolean;
}

export function ImageGallery({
	images,
	alt,
	className,
	category,
	verified,
}: ImageGalleryProps) {
	const t = useTranslations("ImageGallery");
	const [selectedImage, setSelectedImage] = useState(0);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const scrollRef = useRef<HTMLDivElement | null>(null);
	const slides = useMemo(
		() =>
			images.map((src, index) => ({
				src,
				alt: `${alt} ${index + 1}`,
			})),
		[alt, images],
	);

	if (images.length === 0) {
		return null;
	}

	const openModal = (index: number) => {
		setSelectedImage(index);
		setIsModalOpen(true);
	};

	const handleScroll = () => {
		const container = scrollRef.current;
		if (!container) return;

		const viewportCenter = container.scrollLeft + container.clientWidth / 2;
		const nearestIndex = Array.from(container.children).reduce(
			(bestIndex, child, index) => {
				const slide = child as HTMLElement;
				const best = container.children[bestIndex] as HTMLElement | undefined;
				const distance = Math.abs(
					slide.offsetLeft + slide.offsetWidth / 2 - viewportCenter,
				);
				const bestDistance = best
					? Math.abs(best.offsetLeft + best.offsetWidth / 2 - viewportCenter)
					: Number.POSITIVE_INFINITY;

				return distance < bestDistance ? index : bestIndex;
			},
			0,
		);

		setSelectedImage(nearestIndex);
	};

	const scrollToIndex = (index: number) => {
		setSelectedImage(index);
		const container = scrollRef.current;
		const slide = container?.children[index] as HTMLElement | undefined;

		if (container && slide) {
			container.scrollTo({
				left:
					slide.offsetLeft - (container.clientWidth - slide.offsetWidth) / 2,
				behavior: "smooth",
			});
		}
	};

	return (
		<>
			<div className={cn("min-w-0 space-y-3", className)}>
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className="scrollbar-hide flex w-full min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain [scroll-padding-inline:0]"
				>
					{images.map((image, index) => (
						<button
							key={`${image}-${index}`}
							type="button"
							className="group tap-highlight-none relative block aspect-[4/3] w-full min-w-0 max-w-full shrink-0 snap-center overflow-hidden rounded-2xl bg-black/[0.035] text-left sm:aspect-video md:snap-start dark:bg-white/[0.035]"
							onClick={() => openModal(index)}
							aria-label={t("open_image", { index: index + 1 })}
						>
							<Image
								src={image}
								alt={`${alt} ${index + 1}`}
								fill
								className="object-contain transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.015]"
								sizes="(max-width: 768px) calc(100vw - 40px), 66vw"
							/>

							<div className="absolute inset-0 bg-linear-to-t from-black/35 via-transparent to-black/5 opacity-70 transition-opacity group-hover:opacity-100">
								<div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100">
									<span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-black backdrop-blur-sm">
										<ZoomIn className="size-5" />
									</span>
								</div>
							</div>

							{images.length > 1 && (
								<span className="absolute right-3 bottom-3 rounded-full bg-black/70 px-3 py-1 font-mono text-white text-xs backdrop-blur-md">
									{index + 1} / {images.length}
								</span>
							)}

							{(category || verified) && (
								<span className="absolute bottom-3 left-3 flex max-w-[70%] gap-2">
									{category && (
										<Badge className="max-w-full truncate border-0 bg-black/70 text-white backdrop-blur-md">
											{category}
										</Badge>
									)}
									{verified && (
										<Badge className="shrink-0 border-0 bg-white text-black">
											<Shield className="mr-1 size-3" />
											{t("verified")}
										</Badge>
									)}
								</span>
							)}
						</button>
					))}
				</div>

				{images.length > 1 && (
					<div
						className="flex items-center justify-center gap-1"
						role="tablist"
					>
						{images.map((image, index) => (
							<button
								key={`${image}-${index}`}
								type="button"
								onClick={() => scrollToIndex(index)}
								aria-label={t("open_image", { index: index + 1 })}
								aria-selected={selectedImage === index}
								role="tab"
								className="tap-highlight-none flex size-11 items-center justify-center rounded-full"
							>
								<span
									className={cn(
										"h-1.5 rounded-full transition-[width,background-color] duration-300",
										selectedImage === index
											? "w-6 bg-primary"
											: "w-1.5 bg-muted-foreground/35",
									)}
								/>
							</button>
						))}
					</div>
				)}
			</div>

			<Lightbox
				open={isModalOpen}
				close={() => setIsModalOpen(false)}
				index={selectedImage}
				slides={slides}
				plugins={[Counter, Zoom]}
				className="extera-lightbox"
				carousel={{ finite: images.length < 2, padding: 0, spacing: 16 }}
				controller={{
					closeOnBackdropClick: true,
					closeOnPullDown: true,
					closeOnPullUp: true,
				}}
				zoom={{
					maxZoomPixelRatio: 4,
					doubleClickMaxStops: 3,
					pinchZoomV4: true,
					scrollToZoom: true,
				}}
				animation={{ fade: 220, swipe: 360, zoom: 240 }}
				on={{ view: ({ index }) => setSelectedImage(index) }}
				labels={{
					Close: t("close"),
					Previous: t("previous"),
					Next: t("next"),
					Lightbox: t("viewer_title", {
						current: selectedImage + 1,
						total: images.length,
					}),
				}}
				styles={{
					container: { backgroundColor: "rgba(4, 3, 3, 0.96)" },
				}}
			/>
		</>
	);
}
