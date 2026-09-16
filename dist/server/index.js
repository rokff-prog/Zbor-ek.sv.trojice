const PUBLIC_ORIGIN = "https://rokff-prog.github.io";
const SESSION_COOKIE = "zborcek_admin";
const SESSION_SECONDS = 12 * 60 * 60;

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

async function secretValue(binding) {
  if (binding && typeof binding.get === "function") return String(await binding.get());
  return String(binding || "");
}

async function passwordMatches(password, env) {
  if (!env.ADMIN_PASSWORD_SALT || !env.ADMIN_PASSWORD_HASH) return false;
  const salt = await secretValue(env.ADMIN_PASSWORD_SALT);
  const expectedHash = await secretValue(env.ADMIN_PASSWORD_HASH);
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2",
    hash: "SHA-256",
    salt: base64UrlToBytes(salt),
    iterations: 150000,
  }, material, 256);
  return constantTimeEqual(new Uint8Array(bits), base64UrlToBytes(expectedHash));
}

async function signSession(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

async function sessionFor(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const token = cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token || !env.SESSION_SECRET) return { username: "", isAdmin: false };
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return { username: "", isAdmin: false };
  const expected = await signSession(payload, await secretValue(env.SESSION_SECRET));
  if (!constantTimeEqual(new TextEncoder().encode(signature), new TextEncoder().encode(expected))) {
    return { username: "", isAdmin: false };
  }
  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload)));
    const username = String(session.username || "");
    return { username, isAdmin: username === env.ADMIN_USERNAME && Number(session.expiresAt) > Date.now() };
  } catch {
    return { username: "", isAdmin: false };
  }
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
    const { username, isAdmin } = await sessionFor(request, env);
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/api/auth-state") {
      const configured = Boolean(env.ADMIN_USERNAME && env.ADMIN_PASSWORD_SALT && env.ADMIN_PASSWORD_HASH && env.SESSION_SECRET);
      const diagnostics = Object.fromEntries(await Promise.all([
        ["salt", env.ADMIN_PASSWORD_SALT],
        ["hash", env.ADMIN_PASSWORD_HASH],
        ["session", env.SESSION_SECRET],
      ].map(async ([key, binding]) => [key, {
        type: typeof binding,
        constructor: binding?.constructor?.name || "",
        keys: binding && typeof binding === "object" ? Object.keys(binding) : [],
        resolvedLength: (await secretValue(binding)).length,
      }])));
      return Response.json({ isAdmin, username: isAdmin ? username : "", configured, diagnostics }, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    if (url.pathname === "/api/login" && request.method === "POST") {
      let credentials;
      try {
        credentials = await request.json();
      } catch {
        return Response.json({ error: "Neveljavna zahteva." }, { status: 400 });
      }
      const validUsername = String(credentials.username || "") === String(env.ADMIN_USERNAME || "");
      const validPassword = await passwordMatches(String(credentials.password || ""), env).catch(() => false);
      if (!validUsername || !validPassword) {
        return Response.json({ error: "Napačno uporabniško ime ali geslo." }, { status: 401 });
      }
      const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({
        username: env.ADMIN_USERNAME,
        expiresAt: Date.now() + SESSION_SECONDS * 1000,
      })));
      const signature = await signSession(payload, await secretValue(env.SESSION_SECRET));
      return Response.json({ isAdmin: true, username: env.ADMIN_USERNAME }, {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": `${SESSION_COOKIE}=${payload}.${signature}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
        },
      });
    }

    if (url.pathname === "/api/logout" && request.method === "POST") {
      return Response.json({ signedOut: true }, {
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
        },
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

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    if (!request.headers.get("accept")?.includes("text/html")) return response;
    return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
  },
};
