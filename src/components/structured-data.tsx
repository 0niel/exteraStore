export function StructuredData({ data }: { data: unknown }) {
	return (
		<script type="application/ld+json">
			{JSON.stringify(data).replace(/</g, "\\u003c")}
		</script>
	);
}
