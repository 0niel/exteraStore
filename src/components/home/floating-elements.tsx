"use client";

import { motion } from "framer-motion";
import { Code, Sparkles, Zap, Shield, Star, Heart } from "lucide-react";

const icons = [Code, Sparkles, Zap, Shield, Star, Heart];

export function FloatingElements() {
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			{[...Array(8)].map((_, i) => {
				const Icon = icons[i % icons.length];
				const size = 20 + Math.random() * 20;
				const left = 10 + Math.random() * 80;
				const delay = Math.random() * 5;
				const duration = 20 + Math.random() * 10;

				return (
					<motion.div
						key={i}
						className="absolute opacity-10"
						style={{
							left: `${left}%`,
							top: `${-10}%`,
						}}
						initial={{ y: 0, x: 0, rotate: 0, opacity: 0 }}
						animate={{
							y: ["0%", "120vh"],
							x: [0, Math.random() * 100 - 50, 0],
							rotate: [0, 360],
							opacity: [0, 0.15, 0],
						}}
						transition={{
							duration,
							repeat: Number.POSITIVE_INFINITY,
							delay,
							ease: "linear",
						}}
					>
						<Icon size={size} />
					</motion.div>
				);
			})}
		</div>
	);
}

