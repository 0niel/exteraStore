"use client";

import { ChevronLeft, ChevronRight, Shield, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog";

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
	const [selectedImage, setSelectedImage] = useState(0);
	const [isModalOpen, setIsModalOpen] = useState(false);

	if (!images || images.length === 0) {
		return null;
	}

	const openModal = (index: number) => {
		setSelectedImage(index);
		setIsModalOpen(true);
	};

	const nextImage = () => {
		setSelectedImage((prev) => (prev + 1) % images.length);
	};

	const prevImage = () => {
		setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "ArrowRight") nextImage();
		if (e.key === "ArrowLeft") prevImage();
		if (e.key === "Escape") setIsModalOpen(false);
	};

	return (
		<>
			<div className={`space-y-4 ${className}`}>
				<div className="group relative overflow-hidden rounded-xl border">
					<div
						className="relative aspect-video cursor-pointer"
						onClick={() => openModal(selectedImage)}
					>
						<Image
							src={images[selectedImage] ?? images[0] ?? ""}
							alt={`${alt} ${selectedImage + 1}`}
							fill
							className="object-cover transition-transform duration-300 group-hover:scale-105"
							sizes="(max-width: 768px) 100vw, 66vw"
						/>

						<div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20">
							<div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
								<div className="rounded-full bg-white/90 p-3 backdrop-blur-sm">
									<ZoomIn className="h-6 w-6 text-gray-800" />
								</div>
							</div>
						</div>

						{images.length > 1 && (
							<div className="absolute right-4 bottom-4">
								<div className="rounded-full bg-black/60 px-3 py-1 text-sm text-white backdrop-blur-sm">
									{selectedImage + 1} / {images.length}
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
									<Badge className="border-0 bg-blue-500/80 text-white backdrop-blur-sm">
										<Shield className="mr-1 h-3 w-3" />
										Проверен
									</Badge>
								)}
							</div>
						)}
					</div>
				</div>

				{images.length > 1 && (
					<div className="flex gap-2 overflow-x-auto pb-2">
						{images.map((image, index) => (
							<button
								key={index}
								onClick={() => setSelectedImage(index)}
								className={`relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
									selectedImage === index
										? "border-primary ring-2 ring-primary/20"
										: "border-muted hover:border-muted-foreground"
								}`}
							>
								<Image
									src={image}
									alt={`${alt} миниатюра ${index + 1}`}
									fill
									className="object-cover"
									sizes="96px"
								/>
							</button>
						))}
					</div>
				)}
			</div>

			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent
					showCloseButton={false}
					className="max-h-[95vh] max-w-[95vw] border-none bg-black/95 p-0"
					onKeyDown={handleKeyDown}
				>
					<DialogTitle className="sr-only">
						Просмотр изображения {selectedImage + 1} из {images.length}
					</DialogTitle>

					<div className="relative flex h-[95vh] items-center justify-center">
						<Button
							variant="ghost"
							size="icon"
							className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70"
							onClick={() => setIsModalOpen(false)}
						>
							<X className="h-5 w-5" />
						</Button>

						{images.length > 1 && (
							<Button
								variant="ghost"
								size="icon"
								className="-translate-y-1/2 absolute top-1/2 left-4 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
								onClick={prevImage}
							>
								<ChevronLeft className="h-6 w-6" />
							</Button>
						)}

						<div className="relative max-h-full max-w-full">
							<Image
								src={images[selectedImage] ?? ""}
								alt={`${alt} ${selectedImage + 1}`}
								width={1200}
								height={800}
								className="max-h-[90vh] max-w-full object-contain"
								sizes="95vw"
								priority
							/>
						</div>

						{images.length > 1 && (
							<Button
								variant="ghost"
								size="icon"
								className="-translate-y-1/2 absolute top-1/2 right-4 z-10 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
								onClick={nextImage}
							>
								<ChevronRight className="h-6 w-6" />
							</Button>
						)}

						<div className="-translate-x-1/2 absolute bottom-4 left-1/2">
							<div className="rounded-full bg-black/60 px-4 py-2 text-white backdrop-blur-sm">
								<span className="text-sm">
									{selectedImage + 1} из {images.length}
								</span>
								{images.length > 1 && (
									<span className="ml-2 text-xs opacity-70">
										← → для навигации
									</span>
								)}
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
