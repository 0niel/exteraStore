import { Heart, Star, Upload } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TelegramLoginButton } from "~/components/auth/telegram-login";
import { auth } from "~/server/auth";

export default async function SignInPage() {
	const session = await auth();
	if (session?.user) {
		redirect("/");
	}

	const t = await getTranslations("Auth");
	const botUsername =
		process.env.TELEGRAM_BOT_USERNAME ??
		process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

	const benefits = [
		{ icon: Upload, text: t("sign_in_benefit_upload") },
		{ icon: Heart, text: t("sign_in_benefit_favorites") },
		{ icon: Star, text: t("sign_in_benefit_reviews") },
	];

	return (
		<div className="relative isolate flex min-h-[70dvh] items-center justify-center overflow-hidden px-4 py-12">
			<div className="grid-fade absolute inset-0 -z-10" />
			<div className="absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
			<div className="w-full max-w-md">
				<div className="animate-fade-up rounded-3xl border bg-card p-6 shadow-black/5 shadow-xl sm:p-8">
					<div className="mb-6 flex flex-col items-center text-center">
						<div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
							<span className="font-bold text-lg text-primary-foreground">
								eS
							</span>
						</div>
						<h1 className="font-bold text-2xl tracking-tight">
							{t("sign_in_title")}
						</h1>
						<p className="mt-2 text-muted-foreground text-sm">
							{t("sign_in_subtitle")}
						</p>
					</div>

					<ul className="mb-6 space-y-3">
						{benefits.map(({ icon: Icon, text }) => (
							<li key={text} className="flex items-center gap-3 text-sm">
								<span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<Icon className="size-4" />
								</span>
								{text}
							</li>
						))}
					</ul>

					<div className="flex justify-center">
						<TelegramLoginButton botUsername={botUsername} />
					</div>
				</div>

				<div className="mt-6 text-center">
					<Link
						href="/"
						className="text-muted-foreground text-sm underline-offset-4 transition-colors hover:text-foreground hover:underline"
					>
						{t("back_home")}
					</Link>
				</div>
			</div>
		</div>
	);
}
