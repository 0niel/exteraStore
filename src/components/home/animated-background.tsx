"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function AnimatedBackground() {
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			setMousePosition({
				x: e.clientX / window.innerWidth,
				y: e.clientY / window.innerHeight,
			});
		};

		window.addEventListener("mousemove", handleMouseMove);
		return () => window.removeEventListener("mousemove", handleMouseMove);
	}, []);

	return (
		<div className="absolute inset-0 overflow-hidden">
			<motion.div
				className="absolute inset-0 opacity-30"
				animate={{
					background: [
						"radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
						"radial-gradient(circle at 80% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
						"radial-gradient(circle at 50% 80%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
						"radial-gradient(circle at 20% 50%, hsl(var(--primary) / 0.15) 0%, transparent 50%)",
					],
				}}
				transition={{
					duration: 20,
					repeat: Number.POSITIVE_INFINITY,
					ease: "easeInOut",
				}}
			/>

			<motion.div
				className="absolute inset-0"
				style={{
					background: `radial-gradient(circle at ${50 + mousePosition.x * 20}% ${50 + mousePosition.y * 20}%, hsl(var(--primary) / 0.08) 0%, transparent 50%)`,
				}}
			/>

			<div className="absolute inset-0">
				{[...Array(3)].map((_, i) => (
					<motion.div
						key={i}
						className="absolute rounded-full"
						style={{
							width: 400 + i * 200,
							height: 400 + i * 200,
							left: `${30 + i * 20}%`,
							top: `${20 + i * 15}%`,
							background: `radial-gradient(circle, hsl(var(--primary) / ${0.03 - i * 0.01}) 0%, transparent 70%)`,
							filter: "blur(40px)",
						}}
						animate={{
							x: [0, 30, 0],
							y: [0, -30, 0],
							scale: [1, 1.1, 1],
						}}
						transition={{
							duration: 15 + i * 5,
							repeat: Number.POSITIVE_INFINITY,
							ease: "easeInOut",
							delay: i * 2,
						}}
					/>
				))}
			</div>

			<div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-30 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]" />

			<div className="absolute inset-0">
				{[...Array(20)].map((_, i) => (
					<motion.div
						key={i}
						className="absolute h-1 w-1 rounded-full bg-primary/20"
						style={{
							left: `${Math.random() * 100}%`,
							top: `${Math.random() * 100}%`,
						}}
						animate={{
							opacity: [0.2, 0.8, 0.2],
							scale: [1, 1.5, 1],
						}}
						transition={{
							duration: 3 + Math.random() * 3,
							repeat: Number.POSITIVE_INFINITY,
							delay: Math.random() * 5,
						}}
					/>
				))}
			</div>

			<div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
		</div>
	);
}

