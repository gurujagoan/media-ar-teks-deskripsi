# Bertandang ke Rumah Melayu

Media pembelajaran interaktif Bahasa Indonesia (menulis teks deskripsi) yang memakai VR, AR, dan Generative AI, dengan objek rumah adat Melayu Pontianak.

- `index.html`: penjelajahan VR dan alur belajar 6 tahap
- `ar.html`: maket AR (Android ARCore / iPhone AR Quick Look)

## Cara upload ke GitHub Pages

1. Masuk ke github.com, lalu klik **New repository**. Beri nama `media-ar-teks-deskripsi`, pilih **Public**, lalu **Create repository**.
2. Klik **uploading an existing file**. Seret *isi* folder ini (`index.html`, `ar.html`, `README.md`, serta folder `css`, `js`, dan `assets`) ke halaman upload, lalu klik **Commit changes**.
3. Buka **Settings → Pages**. Pada *Branch* pilih `main` dan `/ (root)`, lalu klik **Save**.
4. Tunggu 1–2 menit. Tautan akan muncul: `https://USERNAME.github.io/media-ar-teks-deskripsi/`
5. Masukkan tautan tersebut ke laporan PDF.

## Mengaktifkan GenAI

Klik **⚙ GenAI** di aplikasi, pilih Google Gemini, lalu tempel API key gratis dari https://aistudio.google.com (menu *Get API key*). Key hanya disimpan di browser pengguna. **Jangan** menaruh API key di dalam berkas repositori.

Tanpa key, aplikasi tetap berjalan dengan penilai cadangan offline.

## Demo cepat

Tambahkan `?tahap=1` sampai `?tahap=5` di akhir tautan untuk langsung membuka tahap tertentu.
