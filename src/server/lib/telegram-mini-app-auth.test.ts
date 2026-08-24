import assert from "node:assert/strict";
import test from "node:test";
import { sign } from "@tma.js/init-data-node";
import { validateTelegramMiniAppInitData } from "./telegram-mini-app-auth";

const token = "123456789:abcdefghijklmnopqrstuvwxyzABCDE123456789";

test("validates and normalizes signed Mini App data", () => {
	const initData = sign(
		{
			user: {
				id: 123456789,
				first_name: "Ada",
				last_name: "Lovelace",
				username: "ada",
				photo_url: "https://t.me/i/userpic/320/ada.svg",
			},
		},
		token,
		new Date(),
	);

	assert.deepEqual(validateTelegramMiniAppInitData(initData, token), {
		id: "123456789",
		firstName: "Ada",
		lastName: "Lovelace",
		username: "ada",
		photoUrl: "https://t.me/i/userpic/320/ada.svg",
	});
});

test("rejects tampered Mini App data", () => {
	const initData = sign(
		{ user: { id: 123456789, first_name: "Ada" } },
		token,
		new Date(),
	).replace("Ada", "Mallory");

	assert.throws(() => validateTelegramMiniAppInitData(initData, token));
});

test("rejects expired Mini App data", () => {
	const expired = new Date(Date.now() - 25 * 60 * 60 * 1000);
	const initData = sign(
		{ user: { id: 123456789, first_name: "Ada" } },
		token,
		expired,
	);

	assert.throws(() => validateTelegramMiniAppInitData(initData, token));
});
