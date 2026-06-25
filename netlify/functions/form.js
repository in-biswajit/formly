import { getStore } from "@netlify/blobs";

export default async (req) => {
  const store = getStore("formly");
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  if (req.method === "GET") {
    try {
      const data = await store.get("form", { type: "json" });
      return new Response(JSON.stringify(data || {}), { headers });
    } catch {
      return new Response("{}", { headers });
    }
  }

  if (req.method === "POST") {
    const body = await req.json();
    await store.set("form", JSON.stringify(body));
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = { path: "/api/form" };
