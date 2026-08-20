"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Shield, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
	const reduceMotion = useReducedMotion();
	const [selectedImage, setSelectedImage] = useState(0);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const scrollRef = useRef<HTMLDivElement | null>(null);

	const nextImage = useCallback(() => {
		setSelectedImage((prev) => (prev + 1) % images.length);
	}, [images.length]);

	const prevImage = useCallback(() => {
		setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
	}, [images.length]);

	useEffect(() => {
		if (!isModalOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight") nextImage();
			if (e.key === "ArrowLeft") prevImage();
			if (e.key === "Escape") setIsModalOpen(false);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isModalOpen, nextImage, prevImage]);

	useEffect(() => {
		if (!isModalOpen) return;
		const previous = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = previous;
		};
	}, [isModalOpen]);

	if (!images || images.length === 0) {
		return null;
	}

	const openModal = (index: number) => {
		setSelectedImage(index);
		setIsModalOpen(true);
	};

	const handleScroll = () => {
		const container = scrollRef.current;
		if (!container) return;
		const slide = container.firstElementChild as HTMLElement | null;
		if (!slide) return;
		const index = Math.round(container.scrollLeft / slide.offsetWidth);
		const clamped = Math.min(Math.max(index, 0), images.length - 1);
		if (clamped !== selectedImage) {
			setSelectedImage(clamped);
		}
	};

	const scrollToIndex = (index: number) => {
		setSelectedImage(index);
		const container = scrollRef.current;
		const slide = container?.firstElementChild as HTMLElement | null;
		if (container && slide) {
			container.scrollTo({
				left: index * slide.offsetWidth,
				behavior: reduceMotion ? "auto" : "smooth",
			});
		}
	};

	return (
		<>
			<div className={cn("space-y-3", className)}>
				<div
					ref={scrollRef}
					onScroll={handleScroll}
					className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 md:mx-0 md:px-0"
				>
					{images.map((image, index) => (
						<button
							key={index}
							type="button"
							className="group tap-highlight-none relative block aspect-video w-[86%] shrink-0 snap-center overflow-hidden rounded-xl border text-left md:w-full md:snap-start"
							onClick={() => openModal(index)}
							aria-label={t("open_image", { index: index + 1 })}
						>
							<Image
								src={image}
								alt={`${alt} ${index + 1}`}
								fill
								className="object-cover transition-transform duration-300 group-hover:scale-105"
								sizes="(max-width: 768px) 86vw, 66vw"
							/>

							<div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20">
								<div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
									<div className="rounded-full bg-white/90 p-3 backdrop-blur-sm">
										<ZoomIn className="h-6 w-6 text-black" />
									</div>
								</div>
							</div>

							{images.length > 1 && (
								<div className="absolute right-4 bottom-4">
									<div className="rounded-full bg-black/60 px-3 py-1 text-sm text-white backdrop-blur-sm">
										{index + 1} / {images.length}
									</div>
								</div>
							)}

							{(category || verified) && (
								<div className="absolute bottom-4 left-4 flex gap-2">
									{category && (
										<Badge className="border-0 bg-black/60 text-white backdrop-blur-sm">
											{category}
										</Badge>
									)}
									{verified && (
										<Badge className="border-0 bg-contrast text-contrast-foreground backdrop-blur-sm">
											<Shield className="mr-1 h-3 w-3" />
											{t("verified")}
										</Badge>
									)}
								</div>
							)}
						</button>
					))}
				</div>

				{images.length > 1 && (
					<div className="flex items-center justify-center gap-2">
						{images.map((_, index) => (
							<button
								key={index}
								type="button"
								onClick={() => scrollToIndex(index)}
								aria-label={t("open_image", { index: index + 1 })}
								className="tap-highlight-none flex h-11 w-6 items-center justify-center md:h-6"
							>
								<span
									className={cn(
										"h-1.5 rounded-full transition-all duration-300",
										selectedImage === index
											? "w-5 bg-primary"
											: "w-1.5 bg-muted-foreground/40",
									)}
								/>
							</button>
						))}
					</div>
				)}
			</div>

			<AnimatePresence>
				{isModalOpen && (
					<motion.div
						className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
						initial={reduceMotion ? false : { opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={reduceMotion ? undefined : { opacity: 0 }}
						transition={{ duration: 0.2 }}
						role="dialog"
						aria-modal="true"
						aria-label={t("viewer_title", {
							current: selectedImage + 1,
							total: images.length,
						})}
					>
						<Button
							variant="ghost"
							size="icon"
							className="absolute top-4 right-4 z-10 h-11 w-11 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
							onClick={() => setIsModalOpen(false)}
							aria-label={t("close")}
						>
							<X className="h-5 w-5" />
						</Button>

						{images.length > 1 && (
							<Button
								variant="ghost"
								size="icon"
								className="absolute top-1/2 left-4 z-10 h-12 w-12 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
								onClick={prevImage}
								aria-label={t("previous")}
							>
								<ChevronLeft className="h-6 w-6" />
							</Button>
						)}

						<motion.div
							key={selectedImage}
							className="relative max-h-full max-w-full px-4"
							initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
						>
							<Image
								src={images[selectedImage] ?? ""}
								alt={`${alt} ${selectedImage + 1}`}
								width={1200}
								height={800}
								className="max-h-[90vh] max-w-full object-contain"
								sizes="95vw"
								priority
							/>
						</motion.div>

						{images.length > 1 && (
							<Button
								variant="ghost"
								size="icon"
								className="absolute top-1/2 right-4 z-10 h-12 w-12 -translate-y-1/2 rounded-full bg-black/50 text-white hover:bg-black/70 hover:text-white"
								onClick={nextImage}
								aria-label={t("next")}
							>
								<ChevronRight className="h-6 w-6" />
							</Button>
						)}

						<div className="absolute bottom-4 left-1/2 -translate-x-1/2 pb-safe">
							<div className="rounded-full bg-black/60 px-4 py-2 text-white backdrop-blur-sm">
								<span className="text-sm">
									{t("viewer_title", {
										current: selectedImage + 1,
										total: images.length,
									})}
								</span>
								{images.length > 1 && (
									<span className="ml-2 hidden text-xs opacity-70 md:inline">
										{t("keyboard_hint")}
									</span>
								)}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
