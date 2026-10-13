const API_UNAVAILABLE =
  "Couldn't load live Kilimani reports. Check your connection and try again.";

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  const origin = (
    process.env.API_ORIGIN ?? "https://urbanmesh-vitx.onrender.com"
  ).replace(/\/$/, "");
  if (!origin) {
    res.status(503).json({ error: API_UNAVAILABLE });
    return;
  }

  const incoming = new URL(req.url ?? "/", "http://localhost");
  let pathname = incoming.pathname;
  if (pathname.startsWith("/api/__file")) {
    pathname = pathname.slice("/api/__file".length) || "/";
  }
  const target = `${origin}${pathname}${incoming.search}`;

  const headers = {};
  for (const [key, value] of Object.entries(req.headers ?? {})) {
    if (!value) continue;
    const name = key.toLowerCase();
    if (name === "host" || name === "connection" || name === "content-length") continue;
    headers[name] = Array.isArray(value) ? value.join(",") : value;
  }

  const init = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await readBody(req);
  }

  let upstream;
  try {
    upstream = await fetch(target, init);
  } catch {
    res.status(503).json({ error: API_UNAVAILABLE });
    return;
  }

  res.status(upstream.status);
  upstream.headers.forEach((value, key) => {
    if (key === "content-encoding" || key === "transfer-encoding") return;
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await upstream.arrayBuffer()));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}
