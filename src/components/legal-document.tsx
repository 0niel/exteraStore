import { PageHeader } from "~/components/page-header";
import { Card, CardContent } from "~/components/ui/card";

interface LegalDocumentSection {
	id: string;
	title: string;
	content: string;
}

interface LegalDocumentProps {
	badge: string;
	title: string;
	description: string;
	sections: readonly LegalDocumentSection[];
	lastUpdatedLabel: string;
	lastUpdated: string;
}

export function LegalDocument({
	badge,
	title,
	description,
	sections,
	lastUpdatedLabel,
	lastUpdated,
}: LegalDocumentProps) {
	return (
		<div className="relative isolate overflow-hidden">
			<div className="grid-fade absolute inset-x-0 top-0 -z-10 h-80" />
			<div className="absolute -top-24 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
			<div className="container mx-auto max-w-4xl px-4 py-10 sm:py-14">
				<PageHeader badge={badge} title={title} description={description} />

				<Card className="animate-fade-up py-6 sm:py-8">
					<CardContent>
						<div className="prose prose-neutral dark:prose-invert">
							{sections.map((section, index) => (
								<section key={section.id}>
									<h2 className="flex items-baseline gap-3">
										<span className="min-w-5 shrink-0 whitespace-nowrap font-mono font-semibold text-primary text-sm tabular-nums">
											{String(index + 1).padStart(2, "0")}
										</span>
										{section.title}
									</h2>
									<p>{section.content}</p>
								</section>
							))}
						</div>
					</CardContent>
				</Card>

				<p className="mt-6 flex items-center justify-center gap-2 font-mono text-muted-foreground text-xs uppercase tracking-wider">
					<span className="size-1.5 rounded-full bg-primary" />
					{lastUpdatedLabel}: {lastUpdated}
				</p>
			</div>
		</div>
	);
}
