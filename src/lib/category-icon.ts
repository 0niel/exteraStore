const CATEGORY_EMOJI_BY_SLUG: Record<string, string> = {
	automation: "⚡",
	"bots-automation": "🤖",
	communication: "💬",
	customization: "🎛️",
	development: "💻",
	favorites: "❤️",
	fun: "🤪",
	integrations: "🌐",
	media: "🎬",
	music: "🎵",
	photography: "📸",
	privacy: "🕶️",
	productivity: "🚀",
	security: "🔐",
	social: "👥",
	stickers: "✨",
	tools: "🛠️",
	ui: "🎨",
	utility: "🧰",
};

const LEGACY_ICON_EMOJI: Record<string, string> = {
	camera: "📸",
	code: "💻",
	"eye-off": "🕶️",
	"file-text": "📄",
	globe: "🌐",
	heart: "❤️",
	image: "🎬",
	lock: "🔐",
	"message-square": "💬",
	music: "🎵",
	palette: "🎨",
	rocket: "🚀",
	settings: "⚙️",
	shield: "🔐",
	sliders: "🎛️",
	users: "👥",
	zap: "⚡",
};

const EMOJI_SEQUENCE =
	/^(?:[\p{Regional_Indicator}]{2}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*)$/u;

export function isCategoryEmoji(value: string) {
	return EMOJI_SEQUENCE.test(value.trim());
}

export function getCategoryEmoji(icon?: string | null, slug?: string | null) {
	const normalizedIcon = icon?.trim();
	if (normalizedIcon && isCategoryEmoji(normalizedIcon)) return normalizedIcon;
	if (normalizedIcon) {
		const legacyEmoji = LEGACY_ICON_EMOJI[normalizedIcon.toLowerCase()];
		if (legacyEmoji) return legacyEmoji;
	}

	const normalizedSlug = slug?.trim().toLowerCase();
	return (normalizedSlug && CATEGORY_EMOJI_BY_SLUG[normalizedSlug]) || "📦";
}
