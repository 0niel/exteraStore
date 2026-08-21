export default {
	async fetch(request) {
		const url = new URL(request.url);
		const upstream = new URL(
			`https://openrouter.ai${url.pathname}${url.search}`,
		);
		const headers = new Headers(request.headers);
		headers.set("Host", "openrouter.ai");
		headers.delete("cf-connecting-ip");
		headers.delete("x-forwarded-for");
		return fetch(upstream, {
			method: request.method,
			headers,
			body:
				request.method === "GET" || request.method === "HEAD"
					? undefined
					: request.body,
		});
	},
};
