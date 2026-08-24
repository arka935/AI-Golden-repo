export const config = { runtime: "edge" };

export default async function handler(req) {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const key = process.env.GROQ_API_KEY;
  if (!key) return new Response("GROQ_API_KEY belum diisi di Vercel.", { status: 500 });

  let body;
  try { body = await req.json(); }
  catch { return new Response("JSON tidak valid.", { status: 400 }); }

  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];

  const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen/qwen3.6-27b",
      messages: [
        { role: "system", content: "Kamu adalah AI Golden, asisten yang ramah dan ahli pemrograman. Jawab dengan bahasa pengguna. Jika diminta kode, berikan kode yang lengkap, jelas, dan aman." },
        ...messages
      ],
      temperature: 0.7,
      max_completion_tokens: 2048,
      stream: true
    })
  });

  if (!upstream.ok) {
    const t = await upstream.text();
    return new Response("Groq API error: " + t, { status: upstream.status });
  }

  const reader = upstream.body.getReader();
  const dec = new TextDecoder();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let buf = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (raw === "[DONE]") continue;
            try {
              const j = JSON.parse(raw);
              const piece = j.choices?.[0]?.delta?.content;
              if (piece) controller.enqueue(enc.encode(piece));
            } catch {}
          }
        }
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
