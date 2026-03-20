import app from "../../src/index.ts";

// Netlify Edge Functions pass (Request, Context) where Context.env holds env vars.
// We forward Context.env (or Deno.env.toObject() as fallback) to Hono's bindings.
export default async (request: Request, context: any) => {
  try {
    const env = context?.env ?? (typeof Deno !== "undefined" ? (Deno as any).env.toObject() : {});
    return await app.fetch(request, env, context);
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
};
