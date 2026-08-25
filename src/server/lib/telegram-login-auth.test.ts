import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import {
	type TelegramLoginData,
	validateTelegramLoginData,
} from "./telegram-login-auth";

const token = "123456789:test-token";
const now = 1_787_659_200;

function signedData(
	overrides: Partial<TelegramLoginData> = {},
): TelegramLoginData {
	const unsigned = {
		id: "425066453",
		first_name: "Sergei",
		last_name: "Dmitriev",
		username: "i_am_oniel",
		photo_url: "https://example.com/avatar.jpg",
		auth_date: String(now - 30),
		...overrides,
	};
	const values = Object.entries(unsigned)
		.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
		.map(([key, value]) => `${key}=${value}`)
		.join("\n");
	const secret = crypto.createHash("sha256").update(token).digest();
	return {
		...unsigned,
		hash: crypto.createHmac("sha256", secret).update(values).digest("hex"),
	};
}

test("validates and normalizes Telegram login widget data", () => {
	assert.deepEqual(validateTelegramLoginData(signedData(), token, now), {
		id: "425066453",
		firstName: "Sergei",
		lastName: "Dmitriev",
		username: "i_am_oniel",
		photoUrl: "https://example.com/avatar.jpg",
	});
});

test("rejects tampered Telegram login widget data", () => {
	const data = signedData();
	assert.throws(() =>
		validateTelegramLoginData({ ...data, first_name: "Attacker" }, token, now),
	);
});

test("rejects expired and future Telegram login widget data", () => {
	assert.throws(() =>
		validateTelegramLoginData(
			signedData({ auth_date: String(now - 24 * 60 * 60 - 1) }),
			token,
			now,
		),
	);
	assert.throws(() =>
		validateTelegramLoginData(
			signedData({ auth_date: String(now + 5 * 60 + 1) }),
			token,
			now,
		),
	);
});
