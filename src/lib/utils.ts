import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
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

export function formatDate(date: Date | number | string): string {
	let validDate: Date;
	
	if (typeof date === 'number') {
		validDate = new Date(date * 1000);
	} else if (typeof date === 'string') {
		validDate = new Date(date);
	} else {
		validDate = date;
	}
	
	return new Intl.DateTimeFormat("ru-RU", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(validDate);
}

export function createValidDate(dateInput: Date | number | string): Date {
	if (typeof dateInput === 'number') {
		return new Date(dateInput * 1000);
	} else if (typeof dateInput === 'string') {
		return new Date(dateInput);
	} else {
		return dateInput;
	}
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
