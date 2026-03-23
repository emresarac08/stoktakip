import { schedule } from "@netlify/functions";

// Her 4 günde bir çalışır — Supabase'i aktif tutar (7 günde pause oluyor)
export const handler = schedule("0 9 */4 * *", async () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    console.log(`[keep-alive] Supabase ping: ${response.status} - ${new Date().toISOString()}`);
    return { statusCode: 200 };
  } catch (err) {
    console.error("[keep-alive] Ping başarısız:", err.message);
    return { statusCode: 500 };
  }
});
