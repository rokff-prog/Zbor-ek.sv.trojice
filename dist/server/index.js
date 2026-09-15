const PUBLIC_ORIGIN = "https://rokff-prog.github.io";

function adminFor(request, env) {
  const email = String(request.headers.get("oai-authenticated-user-email") || "").toLowerCase();
  const allowed = String(env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return { email, isAdmin: Boolean(email && allowed.includes(email)) };
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  return origin === PUBLIC_ORIGIN ? {
    "Access-Control-Allow-Origin": PUBLIC_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  } : {};
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { email, isAdmin } = adminFor(request, env);
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/api/auth-state") {
      return Response.json({ isAdmin, email: isAdmin ? email : "" }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (url.pathname === "/api/state") {
      if (!isAdmin) return Response.json({ error: "Nepooblascen dostop." }, { status: 401 });
      if (request.method === "GET") {
        const object = await env.MEDIA.get("app-state.json");
        if (!object) return new Response(null, { status: 404 });
        return new Response(object.body, {
          headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
      }
      if (request.method === "POST") {
        const body = await request.text();
        JSON.parse(body);
        await env.MEDIA.put("app-state.json", body, { httpMetadata: { contentType: "application/json" } });
        return Response.json({ saved: true });
      }
      return new Response(null, { status: 405 });
    }

    if (url.pathname === "/api/public-state" && request.method === "GET") {
      const object = await env.MEDIA.get("app-state.json");
      if (!object) return new Response(null, { status: 404, headers: cors });
      const source = JSON.parse(await object.text());
      const publicState = {
        songs: (source.songs || []).map((song) => ({
          id: song.id,
          songNumber: song.songNumber,
          title: song.title,
          categories: song.categories || [],
          link: song.link || "",
          page: song.page,
          canvaPage: song.canvaPage,
          inBook: Boolean(song.inBook),
        })),
        massHistory: source.massHistory || [],
        canvaPages: source.canvaPages || [],
        canva: source.canva || {},
      };
      return Response.json(publicState, { headers: { ...cors, "Cache-Control": "no-store" } });
    }

    if (url.pathname === "/api/songbook") {
      if (request.method === "GET") {
        const object = await env.MEDIA.get("songbook.json");
        if (!object) return new Response(null, { status: 404, headers: cors });
        return new Response(object.body, {
          headers: { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
        });
      }
      if (request.method === "POST") {
        if (!isAdmin) return Response.json({ error: "Nepooblascen dostop." }, { status: 401 });
        const body = await request.text();
        JSON.parse(body);
        await env.MEDIA.put("songbook.json", body, { httpMetadata: { contentType: "application/json" } });
        return Response.json({ saved: true });
      }
      return new Response(null, { status: 405 });
    }

    if (url.pathname === "/admin" && !email) {
      return Response.redirect(new URL("/signin-with-chatgpt?return_to=/admin", request.url), 302);
    }
    if (url.pathname === "/admin" && !isAdmin) {
      return new Response("Ta racun nima skrbniskega dostopa.", { status: 403 });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    if (!request.headers.get("accept")?.includes("text/html")) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  },
};
