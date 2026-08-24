"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
	const reduceMotion = useReducedMotion();

	if (reduceMotion) {
		return <>{children}</>;
	}

	return (
		<>
			<motion.div
				aria-hidden="true"
				className="route-progress pointer-events-none fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-40 h-0.5 origin-left bg-linear-to-r from-transparent via-primary to-transparent"
				initial={{ scaleX: 0, opacity: 0 }}
				animate={{ scaleX: [0, 1, 1], opacity: [0, 1, 0] }}
				transition={{ duration: 0.7, times: [0, 0.55, 1], ease: "easeOut" }}
			/>
			<motion.div
				className="route-motion min-h-full origin-top"
				initial={{ opacity: 0, y: 8, scale: 0.997 }}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
			>
				{children}
			</motion.div>
		</>
	);
}
