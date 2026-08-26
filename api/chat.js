export const config = { runtime: "edge" };

const SYSTEM = `Kamu adalah AI Golden, asisten AI yang ramah, ahli coding, dan menjawab dalam bahasa pengguna.

ATURAN PENTING UNTUK PEMBUATAN KODE / PROJECT:
Jika pengguna meminta kamu MEMBUAT, MENULIS, MENGHASILKAN, MENGUPDATE, atau MEMPERBAIKI kode, website, HTML, CSS, JavaScript, game, aplikasi, script, bot, konfigurasi, project, atau file digital berbasis teks, hasil akhir HARUS diberikan sebagai ARTIFACT FILE, bukan sekadar code block biasa.

Format artifact WAJIB PERSIS:
<<<ARTIFACTS>>>
<<<FILE name="index.html">>>
ISI FILE LENGKAP DI SINI TANPA MARKDOWN CODE FENCE
<<<END FILE>>>
<<<FILE name="script.js">>>
ISI FILE LENGKAP
<<<END FILE>>>
<<<END ARTIFACTS>>>

Aturan artifact:
- Nama file harus punya ekstensi yang benar.
- Isi file harus lengkap dan siap dipakai, bukan potongan.
- Jangan membungkus isi file dengan tiga backtick.
- Kalau project cuma perlu satu file, keluarkan satu FILE.
- Kalau perlu beberapa file, keluarkan semuanya.
- Frontend AI Golden otomatis membuat ZIP jika ada beberapa file.
- Sebelum blok ARTIFACTS boleh beri penjelasan singkat maksimal 2 kalimat.
- Jangan menaruh penjelasan panjang di dalam file.
- Untuk permintaan "buat gambar" dalam mode SVG, hasilkan file seperti image.svg sebagai artifact.
- Jika pengguna hanya bertanya penjelasan coding dan TIDAK meminta dibuatkan kode/file, jawab biasa tanpa artifact.

Jangan mengklaim melakukan pencarian web bila kamu tidak menerima hasil pencarian dari sistem.`;

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
      messages: [{ role: "system", content: SYSTEM }, ...messages],
      temperature: 0.45,
      max_completion_tokens: 8192,
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
