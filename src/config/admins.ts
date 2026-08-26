import type { Session } from "next-auth";
import { env } from "~/env";

const ADMINS = env.NEXT_PUBLIC_INITIAL_ADMINS.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);

export function isAdminUser(user: Session["user"] | null | undefined): boolean {
	return Boolean(
		user &&
			(user.role === "admin" ||
				(user.telegramUsername &&
					ADMINS.includes(user.telegramUsername.toLowerCase()))),
	);
}
