import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: requester } = await admin.auth.getUser(token);
  if (!requester.user) {
    return json({ error: "Not authenticated" }, 401);
  }

  const { data: requesterProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", requester.user.id)
    .single();

  if (requesterProfile?.role !== "main-admin") {
    return json({ error: "Only main-admin can create users" }, 403);
  }

  const { email, password, username, role } = await req.json();
  const safeRole = role === "admin" ? "admin" : "user";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, role: safeRole },
  });

  if (error) return json({ error: error.message }, 400);

  await admin.from("profiles").upsert({
    id: data.user.id,
    email,
    username,
    role: safeRole,
  });

  return json({ user: data.user });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
