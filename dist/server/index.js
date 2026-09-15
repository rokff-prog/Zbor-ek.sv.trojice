export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/auth-state") {
      const email = String(request.headers.get("oai-authenticated-user-email") || "").toLowerCase();
      const allowedEmails = String(env.ADMIN_EMAILS || "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      const isAdmin = Boolean(email && allowedEmails.includes(email));
      return Response.json({ isAdmin, email: isAdmin ? email : "" }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;

    const acceptsHtml = request.headers.get("accept")?.includes("text/html");
    if (!acceptsHtml) return response;

    const indexUrl = new URL("/index.html", request.url);
    return env.ASSETS.fetch(new Request(indexUrl, request));
  },
};
