// Supabase Edge Function — notify-admin (Deno / TypeScript)
// Sends FCM push notifications to all admin devices when a new order arrives.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── JWT helper for Google OAuth2 (FCM v1 API) ──────────────────────────────
async function generateAccessToken(serviceAccount: any): Promise<string> {
  const privateKeyPem: string = serviceAccount.private_key;
  const clientEmail: string = serviceAccount.client_email;
  const tokenUrl = "https://oauth2.googleapis.com/token";

  const pemContents = privateKeyPem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: tokenUrl,
    exp: now + 3600,
    iat: now,
  };

  const textEncoder = new TextEncoder();
  const base64UrlEncode = (str: string | Uint8Array): string => {
    const bytes = typeof str === "string" ? textEncoder.encode(str) : str;
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = textEncoder.encode(`${encodedHeader}.${encodedPayload}`);

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, dataToSign);
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) throw new Error(`OAuth token error: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

// ── Main handler ────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const payload = await req.json();
    console.log("Received webhook payload:", JSON.stringify(payload));

    const order = payload.record;
    if (!order) {
      return Response.json({ error: "No order record found" }, { status: 400 });
    }

    // Create Supabase client with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch admin FCM tokens
    const { data: admins, error: adminErr } = await supabase
      .from("profiles")
      .select("fcm_token")
      .eq("is_admin", true)
      .not("fcm_token", "is", null);

    if (adminErr) {
      return Response.json({ error: adminErr.message }, { status: 500 });
    }

    const tokens: string[] = (admins ?? [])
      .map((a: any) => a.fcm_token)
      .filter(Boolean);

    if (tokens.length === 0) {
      return Response.json({ message: "No registered admin FCM tokens" });
    }

    // Firebase service account
    const serviceAccountStr = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountStr) {
      return Response.json(
        { error: "FIREBASE_SERVICE_ACCOUNT secret not configured" },
        { status: 500 }
      );
    }

    const serviceAccount = JSON.parse(serviceAccountStr);
    const accessToken = await generateAccessToken(serviceAccount);

    // استخراج تفاصيل المنتجات والعنوان لتضمينها في الإشعار
    const itemsList = Array.isArray(order.items) 
      ? order.items.map((i: any) => `${i.name} (${i.quantity}x)`).join('، ')
      : '';
    const detailsBody = `القيمة: ${order.total_amount} ج.س\nالهاتف: ${order.phone || 'غير محدد'}\nالعنوان: ${order.shipping_address || 'غير محدد'}\nالمنتجات: ${itemsList}`;

    const results = [];
    for (const token of tokens) {
      const fcmUrl = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
      const fcmRes = await fetch(fcmUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: `🚨 طلب جديد وارد #${order.order_number || order.id}!`,
              body: detailsBody,
            },
            data: {
              orderId: String(order.id),
              orderNumber: String(order.order_number || order.id),
              type: "new_order"
            },
            android: {
              priority: "high",
              notification: {
                sound: "app_alarm",
                channel_id: "new_orders",
                click_action: "OPEN_ADMIN_DASHBOARD"
              }
            },
          },
        }),
      });

      const respText = await fcmRes.text();
      results.push({ token: token.substring(0, 12) + "...", status: fcmRes.status, response: respText });
      console.log("FCM result:", fcmRes.status, respText);
    }

    return Response.json({ message: "Notifications processed", results });
  } catch (err: any) {
    console.error("Error in notify-admin:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
