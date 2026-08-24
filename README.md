# AI Golden V2 — HP Only / Free Plan

Tidak butuh PC, VPS, atau domain sendiri.

Yang dibutuhkan:
1. Akun GitHub gratis
2. Akun Vercel gratis
3. Akun Groq gratis + API key

Cara pasang dari HP:
1. Buka console.groq.com dan buat akun.
2. Buat API key, lalu salin.
3. Buat repository GitHub baru lalu upload semua isi ZIP ini.
4. Buka vercel.com, pilih Add New > Project.
5. Import repository GitHub tadi.
6. Buka Project > Settings > Environment Variables.
7. Tambahkan:
   Name: GROQ_API_KEY
   Value: API key Groq kamu
8. Redeploy project.
9. Buka:
   https://NAMA-PROJECT.vercel.app/new/chat

PENTING:
- Jangan simpan API key di index.html.
- API key hanya disimpan di Vercel Environment Variables.
- Model default: qwen/qwen3.6-27b
- Free Plan tetap memiliki rate limit.
