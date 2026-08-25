import assert from "node:assert/strict";
import test from "node:test";
import {
	assessDonationMethod,
	getSafeDonationUrl,
	isLikelyPhone,
	parseDonationRequisites,
} from "../../lib/donation-requisites";

test("public phone requisites receive the strongest warning", () => {
	assert.equal(isLikelyPhone("+7 (999) 123-45-67"), true);
	assert.deepEqual(
		assessDonationMethod({ type: "sbp", value: "+7 (999) 123-45-67" }),
		{ code: "phone_public", level: "danger" },
	);
});

test("an SBP payment link is safe and normalized without accepting a public phone", () => {
	assert.deepEqual(
		assessDonationMethod({ type: "sbp", value: "qr.nspk.ru/test" }),
		{ code: "safe_link", level: "safe" },
	);
	assert.equal(
		parseDonationRequisites(
			JSON.stringify([{ type: "sbp", value: "qr.nspk.ru/test" }]),
		)[0]?.value,
		"https://qr.nspk.ru/test",
	);
});

test("donation links allow only public HTTPS-style values", () => {
	assert.equal(
		getSafeDonationUrl("boosty.to/developer"),
		"https://boosty.to/developer",
	);
	assert.equal(getSafeDonationUrl("javascript:alert(1)"), null);
	assert.equal(getSafeDonationUrl("http://example.com"), null);
	assert.equal(getSafeDonationUrl("https://user:secret@example.com"), null);
});

test("server parsing normalizes safe links and rejects unsafe schemes", () => {
	assert.deepEqual(
		parseDonationRequisites(
			JSON.stringify([
				{ type: "boosty", value: "boosty.to/developer", label: "Поддержать" },
			]),
		),
		[
			{
				type: "boosty",
				value: "https://boosty.to/developer",
				label: "Поддержать",
			},
		],
	);
	assert.throws(
		() =>
			parseDonationRequisites(
				JSON.stringify([{ type: "custom", value: "data:text/html,test" }]),
			),
		/INVALID_DONATION_URL/,
	);
});

test("server parsing enforces method and field limits", () => {
	assert.throws(() =>
		parseDonationRequisites(
			JSON.stringify(
				Array.from({ length: 9 }, () => ({
					type: "ton",
					value: "UQ123",
				})),
			),
		),
	);
	assert.throws(() =>
		parseDonationRequisites(
			JSON.stringify([{ type: "card", value: "1".repeat(501) }]),
		),
	);
});
