import { env } from "~/env";

export const ADMINS = env.NEXT_PUBLIC_INITIAL_ADMINS.split(",")
	.map((a) => a.trim().toLowerCase())
	.filter(Boolean);
