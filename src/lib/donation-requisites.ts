import { z } from "zod";

export const DONATION_METHOD_TYPES = [
	"sbp",
	"card",
	"yoomoney",
	"boosty",
	"donationalerts",
	"ton",
	"usdt_trc20",
	"btc",
	"custom",
] as const;

export type DonationMethodType = (typeof DONATION_METHOD_TYPES)[number];

export interface DonationMethod {
	type: DonationMethodType;
	value: string;
	label?: string;
}

export type DonationAssessmentCode =
	| "empty"
	| "phone_public"
	| "card_public"
	| "unsafe_url"
	| "invalid_url"
	| "public_identifier"
	| "safe_link"
	| "wallet_address";

export interface DonationAssessment {
	code: DonationAssessmentCode;
	level: "info" | "safe" | "warning" | "danger";
}

const methodSchema = z.object({
	type: z.enum(DONATION_METHOD_TYPES),
	value: z.string().trim().min(1).max(500),
	label: z.string().trim().max(80).optional(),
});

export const donationRequisitesSchema = z.array(methodSchema).max(8);

function digits(value: string) {
	return value.replace(/\D/g, "");
}

export function isLikelyPhone(value: string) {
	const normalized = digits(value);
	return normalized.length >= 10 && normalized.length <= 15;
}

export function isLikelyCard(value: string) {
	const normalized = digits(value);
	return normalized.length >= 13 && normalized.length <= 19;
}

export function getSafeDonationUrl(value: string) {
	try {
		const url = new URL(value.includes("://") ? value : `https://${value}`);
		if (url.protocol !== "https:" || url.username || url.password) return null;
		return url.toString();
	} catch {
		return null;
	}
}

export function assessDonationMethod(
	method: DonationMethod,
): DonationAssessment {
	const value = method.value.trim();
	if (!value) return { code: "empty", level: "info" };
	if (/^(javascript|data|file):/i.test(value)) {
		return { code: "unsafe_url", level: "danger" };
	}
	if (method.type === "sbp" && isLikelyPhone(value)) {
		return { code: "phone_public", level: "danger" };
	}
	if (method.type === "sbp" && getSafeDonationUrl(value)) {
		return { code: "safe_link", level: "safe" };
	}
	if (method.type === "card" && isLikelyCard(value)) {
		return { code: "card_public", level: "warning" };
	}
	if (["boosty", "donationalerts", "custom"].includes(method.type)) {
		return getSafeDonationUrl(value)
			? { code: "safe_link", level: "safe" }
			: { code: "invalid_url", level: "warning" };
	}
	if (["ton", "usdt_trc20", "btc"].includes(method.type)) {
		return { code: "wallet_address", level: "safe" };
	}
	return { code: "public_identifier", level: "warning" };
}

export function parseDonationRequisites(value: string) {
	const parsed = donationRequisitesSchema.parse(JSON.parse(value));
	return parsed.map((method) => {
		if (/^(javascript|data|file):/i.test(method.value)) {
			throw new Error("INVALID_DONATION_URL");
		}
		const isLink = ["boosty", "donationalerts", "custom"].includes(method.type);
		const isSbpLink = method.type === "sbp" && !isLikelyPhone(method.value);
		const safeUrl =
			isLink || isSbpLink ? getSafeDonationUrl(method.value) : null;
		if (isLink && !safeUrl) {
			throw new Error("INVALID_DONATION_URL");
		}
		return {
			...method,
			value: safeUrl || method.value,
			label: method.label || undefined,
		};
	});
}
