"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			position="top-right"
			expand
			closeButton
			richColors
			visibleToasts={4}
			offset={{ top: 16, right: 16 }}
			mobileOffset={{ top: 8, right: 8, left: 8 }}
			toastOptions={{
				duration: 4500,
				classNames: {
					toast:
						"!rounded-2xl !border-0 !bg-popover/95 !text-popover-foreground !shadow-none backdrop-blur-xl",
					title: "!font-semibold",
					description: "!text-muted-foreground",
					closeButton:
						"!border-0 !bg-muted !text-foreground hover:!bg-muted/80",
				},
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "transparent",
				} as React.CSSProperties
			}
			{...props}
		/>
	);
};

export { Toaster };
