import { withSupabase } from "@supabase/server"

export default {
  fetch: withSupabase({ auth: "user" }, async (_req, ctx) => {
    // ctx.supabase is automatically RLS-scoped to the authenticated user
    const { data, error } = await ctx.supabase
      .from("products")
      .select("*")
      .eq("available", true);

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({
      message: "مرحباً بك في دالة مطعم 50 فاكهة السحابية! (Supabase Edge Function)",
      products: data
    });
  }),
}
