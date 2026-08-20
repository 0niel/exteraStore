import { env } from "~/env";

const ADMIN_USERNAMES = (env.INITIAL_ADMINS ?? "")
	.split(",")
	.map((name) => name.trim().toLowerCase())
	.filter(Boolean);

export function isAdminSessionUser(user: {
	role?: string | null;
	telegramUsername?: string | null;
}): boolean {
	return (
		user.role === "admin" ||
		ADMIN_USERNAMES.includes((user.telegramUsername ?? "").toLowerCase())
	);
}
