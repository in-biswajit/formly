import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const store = getStore("formly");
  const headers = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  const id = context.params?.id;

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });

  if (req.method === "GET") {
    const data = await store.get("responses", { type: "json" });
    return new Response(JSON.stringify(data || []), { headers });
  }

  if (req.method === "POST") {
    const body = await req.json();
    const existing = (await store.get("responses", { type: "json" })) || [];
    existing.push(body);
    await store.set("responses", JSON.stringify(existing));
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  if (req.method === "DELETE" && id) {
    const existing = (await store.get("responses", { type: "json" })) || [];
    await store.set("responses", JSON.stringify(existing.filter(r => r._id !== id)));
    return new Response(JSON.stringify({ ok: true }), { headers });
  }

  return new Response("Method Not Allowed", { status: 405 });
};

export const config = { path: ["/api/responses", "/api/responses/:id"] };
