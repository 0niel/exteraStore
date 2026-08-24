import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function safeJsonParse<T>(value: string, fallback: T): T {
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

export function formatNumber(num: number): string {
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}
	return num.toString();
}

export function formatDate(
	date: Date | number | string,
	locale?: string,
): string {
	let validDate: Date;

	if (typeof date === "number") {
		validDate = new Date(date * 1000);
	} else if (typeof date === "string") {
		validDate = new Date(date);
	} else {
		validDate = date;
	}

	return new Intl.DateTimeFormat(locale ?? "en", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(validDate);
}

export function createValidDate(dateInput: Date | number | string): Date {
	if (typeof dateInput === "number") {
		return new Date(dateInput * 1000);
	} else if (typeof dateInput === "string") {
		return new Date(dateInput);
	} else {
		return dateInput;
	}
}

function russianPlural(value: number, forms: [string, string, string]) {
	const lastTwo = value % 100;
	const last = value % 10;
	if (lastTwo >= 11 && lastTwo <= 19) return forms[2];
	if (last === 1) return forms[0];
	if (last >= 2 && last <= 4) return forms[1];
	return forms[2];
}

export function formatRelativeTime(
	date: Date | number | string,
	now: Date = new Date(),
	locale = "ru",
) {
	const deltaSeconds = Math.round(
		(createValidDate(date).getTime() - now.getTime()) / 1000,
	);
	const absoluteSeconds = Math.abs(deltaSeconds);
	const isFuture = deltaSeconds > 0;

	if (absoluteSeconds < 45) {
		return locale.startsWith("ru") ? "только что" : "just now";
	}

	const units = [
		{
			limit: 60,
			seconds: 1,
			en: "second",
			ru: ["секунду", "секунды", "секунд"],
		},
		{
			limit: 3600,
			seconds: 60,
			en: "minute",
			ru: ["минуту", "минуты", "минут"],
		},
		{
			limit: 86400,
			seconds: 3600,
			en: "hour",
			ru: ["час", "часа", "часов"],
		},
		{
			limit: 2592000,
			seconds: 86400,
			en: "day",
			ru: ["день", "дня", "дней"],
		},
		{
			limit: 31536000,
			seconds: 2592000,
			en: "month",
			ru: ["месяц", "месяца", "месяцев"],
		},
		{
			limit: Number.POSITIVE_INFINITY,
			seconds: 31536000,
			en: "year",
			ru: ["год", "года", "лет"],
		},
	] as const;
	const unit =
		units.find((candidate) => absoluteSeconds < candidate.limit) ?? units[5];
	const value = Math.max(1, Math.round(absoluteSeconds / unit.seconds));

	if (locale.startsWith("ru")) {
		const phrase = `${value} ${russianPlural(value, [...unit.ru])}`;
		return isFuture ? `через ${phrase}` : `${phrase} назад`;
	}

	const phrase = `${value} ${unit.en}${value === 1 ? "" : "s"}`;
	return isFuture ? `in ${phrase}` : `${phrase} ago`;
}

export function generateSlug(text: string): string {
	const translitMap: Record<string, string> = {
		а: "a",
		б: "b",
		в: "v",
		г: "g",
		д: "d",
		е: "e",
		ё: "yo",
		ж: "zh",
		з: "z",
		и: "i",
		й: "y",
		к: "k",
		л: "l",
		м: "m",
		н: "n",
		о: "o",
		п: "p",
		р: "r",
		с: "s",
		т: "t",
		у: "u",
		ф: "f",
		х: "h",
		ц: "ts",
		ч: "ch",
		ш: "sh",
		щ: "sch",
		ъ: "",
		ы: "y",
		ь: "",
		э: "e",
		ю: "yu",
		я: "ya",
		" ": "-",
		_: "-",
	};

	return text
		.toLowerCase()
		.split("")
		.map((char) => translitMap[char] || char)
		.join("")
		.replace(/[^a-z0-9-]/g, "")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function generateUniqueSlug(
	baseSlug: string,
	existingSlugs: string[],
): string {
	let slug = baseSlug;
	let counter = 1;

	while (existingSlugs.includes(slug)) {
		slug = `${baseSlug}-${counter}`;
		counter++;
	}

	return slug;
}

export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return `${text.slice(0, maxLength)}...`;
}

export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

export function escapeHtml(unsafe: string): string {
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
