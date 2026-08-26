import { ImageResponse } from "next/og";

export const alt = "exteraStore — независимый каталог плагинов для Telegram";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				justifyContent: "space-between",
				background: "#0b0909",
				color: "#fff",
				padding: "72px",
				fontFamily: "sans-serif",
			}}
		>
			<div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						width: "74px",
						height: "74px",
						borderRadius: "24px",
						background: "#ef233c",
						fontSize: "32px",
						fontWeight: 800,
					}}
				>
					eS
				</div>
				<div style={{ fontSize: "38px", fontWeight: 750 }}>exteraStore</div>
			</div>
			<div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
				<div
					style={{
						maxWidth: "980px",
						fontSize: "74px",
						fontWeight: 800,
						lineHeight: 1.02,
						letterSpacing: "-3px",
					}}
				>
					Плагины для Telegram без лишнего шума
				</div>
				<div style={{ fontSize: "28px", color: "#b8b0b0" }}>
					exteraGram + exteraless · независимый проект
				</div>
			</div>
			<div
				style={{
					display: "flex",
					width: "100%",
					height: "10px",
					borderRadius: "999px",
					background: "#ef233c",
				}}
			/>
		</div>,
		size,
	);
}
