# Kuliner Tersembunyi

Web responsif untuk menemukan kuliner lokal di Kota Bandung.

## Menjalankan project

```bash
npm install
npm run dev
```

Salin `.env.example` menjadi `.env.local` jika ingin mulai mengisi konfigurasi layanan.

Jika PowerShell memblokir perintah `npm`, gunakan bentuk `.cmd`:

```bash
npm.cmd install
npm.cmd run dev
```

## Status tahap 1

- React + Vite + TypeScript sudah disiapkan.
- Routing dasar untuk halaman publik, login, favorit, kontribusi, dan admin tersedia.
- Halaman jelajah menggunakan data contoh lokal agar alur UI dapat diuji sebelum database dan Maps API dihubungkan.
- Peta saat ini berupa pratinjau visual; integrasi provider peta dilakukan pada tahap berikutnya.

## Status backend Supabase

- Migration schema awal tersedia di `supabase/migrations/202607180001_initial_schema.sql`.
- Migration foto kontribusi dan policy Storage tersedia di `supabase/migrations/202607180002_contribution_photos.sql`.
- Dokumentasi tabel dan aturan akses tersedia di `supabase/README.md`.
- `.env.local` sudah disiapkan dengan URL project dan publishable key Supabase.
- Migration schema sudah dijalankan di project Supabase (dikonfirmasi user).
- Supabase CLI belum tersedia di workspace, sehingga verifikasi langsung dari lokal belum dilakukan.

## Progress project

### Selesai

- [x] Membaca dan memahami PRD serta workflow.
- [x] Menentukan scope MVP: Kota Bandung.
- [x] Menentukan kategori `makanan` dan `minuman`, kisaran harga, label halal, dan jam buka.
- [x] Membuat project React + Vite + TypeScript.
- [x] Membuat layout responsive mobile-first dan routing dasar.
- [x] Membuat data contoh kuliner Bandung serta pencarian dan filter.
- [x] Membuat migration Supabase dengan tabel, trigger, index, dan Row Level Security.
- [x] Menyiapkan konfigurasi environment Supabase untuk frontend.
- [x] Menjalankan migration schema di Supabase.
- [x] Membuat `supabase/seed.sql` berisi data demo kuliner Bandung.
- [x] Menjalankan seed data demo di Supabase.
- [x] Membuat adapter query untuk `places` dan `place_hours`.
- [x] Menghubungkan halaman jelajah dan detail tempat ke Supabase.
- [x] Menambahkan login dan registrasi email/password dengan Supabase Auth.
- [x] Menambahkan alur login Google OAuth pada frontend.
- [x] Menambahkan toggle favorit dan halaman daftar favorit berbasis Supabase.
- [x] Memperbaiki tombol simpan pada detail agar benar-benar insert/delete ke tabel `favorites`.
- [x] Mengubah halaman usulan menjadi form nyata yang hanya terbuka untuk user yang sudah login.
- [x] Menambahkan field kategori, kisaran harga, label halal, lokasi, deskripsi, kontak, dan jam buka 7 hari.
- [x] Menghubungkan submit usulan ke `place_submissions` dan `place_submission_hours` dengan status `pending`.
- [x] Menambahkan bucket Storage private `place-submission-photos` dengan validasi JPG/PNG/WebP dan batas 5 MB per foto.
- [x] Meng-upload foto usulan ke Storage dan menyimpan metadata path di `place_submission_photos`.
- [x] Menambahkan halaman riwayat kontribusi user di `/kontribusi` dengan status, foto, dan alasan penolakan.
- [x] Membuat panel admin aktif di `/admin` untuk approve, reject dengan alasan, edit, archive, dan restore usulan.
- [x] Mempromosikan usulan yang disetujui ke `places`, `place_hours`, dan `place_photos`, serta mencatat aksi di `moderation_logs`.
- [x] Menampilkan foto `place_photos` yang approved pada kartu beranda, favorit, dan halaman detail melalui signed URL.

### Tahap berikutnya — Foto usulan dan moderasi admin

Fitur foto, riwayat kontribusi, dan moderasi pada tahap ini sudah diimplementasikan. Daftar berikut berisi aktivasi/verifikasi yang masih perlu dilakukan.

1. Uji login email/password, logout, simpan favorit, dan hapus favorit di browser lokal.
2. Jalankan migration `supabase/migrations/202607180002_contribution_photos.sql` di project Supabase.
3. Atur minimal satu akun admin dengan `update public.profiles set role = 'admin' where id = '<user_id>';` melalui SQL Editor.
4. Konfigurasi Google OAuth menjelang deployment atau ketika domain production sudah tersedia.
5. Ganti pratinjau visual dengan integrasi peta asli setelah provider Maps dipilih.

## Catatan integrasi data

- Query frontend berada di `src/lib/places.ts`.
- `HomePage` dan `PlaceDetailPage` mengambil data dari Supabase.
- Jika environment atau query Supabase gagal, halaman jelajah memakai data demo lokal dan menampilkan notifikasi error.
- Setelah mengubah `.env.local`, server Vite perlu direstart.
- Tombol favorit pada detail menampilkan status `Simpan` atau `Tersimpan` dan mengarahkan user ke login jika belum masuk.
- Halaman usulan menampilkan akun aktif dan tidak lagi meminta login ulang ketika session masih valid.
- Foto usulan di-upload ke bucket private `place-submission-photos`; foto yang sudah disetujui dipakai ulang oleh `place_photos`.
- Riwayat kontribusi tersedia di `/kontribusi`; panel admin memerlukan role `admin` pada `profiles`.
- Foto approved pada katalog publik diambil dari bucket private melalui signed URL; foto pending tetap tidak ditampilkan ke pengunjung.

## Status authentication

- Email/password sudah terhubung melalui Supabase Auth.
- Login Google sudah tersedia melalui `signInWithOAuth({ provider: 'google' })`.
- Konfigurasi provider Google sengaja ditunda sampai tahap deployment/domain production.
- Google OAuth tetap membutuhkan konfigurasi manual pada Supabase Dashboard dan Google Cloud. Detailnya ada di `supabase/README.md`.
- Publishable key boleh digunakan di frontend; jangan gunakan `secret` atau `service_role` key.

## Keputusan development lokal

- Login email/password dan fitur favorit digunakan untuk pengujian lokal.
- Google OAuth belum perlu diaktifkan selama aplikasi masih berjalan di localhost.
- Fokus tahap berikutnya adalah konfigurasi Google OAuth dan integrasi peta asli setelah kebutuhan deployment/provider diputuskan.

## Catatan kerja untuk sesi berikutnya

Setiap task yang selesai harus dicatat kembali pada bagian `Progress project` di README ini agar konteks project tetap terbaca ketika percakapan atau model AI berganti.
