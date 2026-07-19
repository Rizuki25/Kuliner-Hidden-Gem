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

## Status project

- React + Vite + TypeScript sudah disiapkan.
- Routing tersedia untuk halaman publik, login, favorit, kontribusi, dan admin.
- Data publik dan kontribusi terhubung ke Supabase.
- Peta publik sudah menggunakan Leaflet dan OpenStreetMap.
- Google OAuth sudah tersedia di frontend, tetapi provider belum diaktifkan.

## Status backend Supabase

- Migration schema awal tersedia di `supabase/migrations/202607180001_initial_schema.sql`.
- Migration foto kontribusi dan policy Storage tersedia di `supabase/migrations/202607180002_contribution_photos.sql`.
- Hotfix akses foto publik tersedia di `supabase/migrations/202607190001_public_approved_photo_access.sql` dan `supabase/migrations/202607190002_public_approved_photo_policy_definer.sql`.
- Migration klaim bisnis, bucket bukti kepemilikan, dan policy manager tersedia di `supabase/migrations/202607190003_business_claim_proofs_and_manager_policies.sql`.
- Dokumentasi tabel dan aturan akses tersedia di `supabase/README.md`.
- `.env.local` digunakan untuk URL project dan publishable key Supabase, serta diabaikan oleh Git.
- Migration schema dan migration foto sudah dijalankan di project Supabase.
- Migration klaim bisnis sudah dijalankan dan diuji di project Supabase.
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
- [x] Membuat dan menjalankan seed data demo kuliner Bandung.
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
- [x] Memperbaiki policy Storage agar foto approved tetap dapat dibuatkan signed URL untuk pengunjung tanpa login.
- [x] Mengganti pratinjau visual dengan peta interaktif Leaflet/OpenStreetMap menggunakan koordinat tempat, marker, zoom, tooltip, dan lokasi pengguna.
- [x] Menambahkan geocoding alamat pada form usulan dengan hasil pencarian Nominatim serta pin peta yang dapat dipilih lewat klik dan digeser untuk koreksi manual.
- [x] Menambahkan rating bintang dan form ulasan komunitas pada halaman detail tempat.
- [x] Menampilkan ulasan approved serta menyediakan edit dan hapus ulasan milik user.
- [x] Menambahkan antrean moderasi ulasan di panel admin untuk approve, reject, archive, dan restore.
- [x] Menambahkan form pengajuan klaim kepemilikan bisnis pada halaman detail tempat.
- [x] Menambahkan panel admin untuk memeriksa bukti, menyetujui, dan menolak klaim bisnis.
- [x] Approval klaim otomatis memberikan akses manager dan role `owner` melalui trigger Supabase.
- [x] Menambahkan UI owner di `/kelola-tempat` untuk mengubah deskripsi, kontak, link, jam buka, dan foto tempat terverifikasi.

### Verifikasi yang sudah dilakukan

1. [x] Smoke test login email/password, logout, favorit, upload foto, approve/reject, archive, dan foto publik.
2. [x] Menjalankan migration `supabase/migrations/202607180002_contribution_photos.sql` di project Supabase.
3. [x] Mengatur minimal satu akun admin dengan role `admin` melalui SQL Editor.
4. [x] Menguji peta asli dan marker tempat dari koordinat Supabase.
5. [x] Menguji pengajuan, upload bukti, approve, reject, dan pengajuan ulang klaim bisnis.

### Verifikasi fitur rating dan ulasan

- [x] User mengirim rating dan ulasan baru dari halaman detail.
- [x] Ulasan pending tidak tampil publik sebelum disetujui admin.
- [x] Admin approve, reject, archive, dan restore ulasan.
- [x] User dapat mengedit atau menghapus ulasannya sendiri.
- [x] Rating rata-rata dan jumlah ulasan berubah setelah approval atau penghapusan.

### Verifikasi fitur klaim bisnis

- [x] User mengunggah bukti dan mengirim klaim dari halaman detail tempat.
- [x] Admin membuka bukti, lalu approve atau reject klaim dengan alasan.
- [x] Approval membuat record `place_managers` dan mengubah role user menjadi `owner`.
- [x] Klaim yang ditolak dapat diajukan ulang setelah alasan diperbaiki.

### Verifikasi fitur pengelolaan owner

- [ ] Owner membuka `/kelola-tempat` dan hanya melihat tempat yang memiliki manager aktif.
- [ ] Owner memperbarui deskripsi, kontak, link, dan jam buka.
- [ ] Owner mengunggah foto, mengganti foto sampul, dan menghapus foto.
- [ ] Perubahan owner tampil pada halaman publik tempat.

### Pekerjaan yang ditunda

- [ ] Konfigurasi Google OAuth sampai domain production atau kebutuhan login Google sudah siap.

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
- Migration hotfix `supabase/migrations/202607190001_public_approved_photo_access.sql` memastikan foto approved dapat dibaca pengunjung tanpa membuka seluruh bucket.
- Peta menggunakan Leaflet dengan tile OpenStreetMap dan tidak memerlukan Google Maps API key.
- Form usulan menyediakan tombol pencarian alamat berbasis Nominatim; user tetap memilih hasil yang sesuai atau mengeklik peta untuk menempatkan pin sebelum mengirim.
- Halaman detail menyediakan rating 1–5, ulasan pending milik user, daftar ulasan approved, serta edit/hapus ulasan sendiri.
- Panel admin memuat antrean ulasan dari tabel `reviews`; perubahan status memicu perhitungan ulang `places.rating` dan `places.review_count` melalui trigger database.

## Integrasi klaim bisnis

- Pengajuan klaim bisnis memakai bucket private `business-claim-proofs`; bukti hanya dapat dibaca oleh pengaju dan admin melalui signed URL.
- Panel admin memuat antrean klaim dari tabel `business_claims`; approval memicu sinkronisasi `place_managers` dan role `owner` melalui trigger database.
- UI pengelolaan detail oleh owner terverifikasi masih menjadi subtahap berikutnya.

## Status authentication

- Email/password sudah terhubung melalui Supabase Auth.
- Login Google sudah tersedia melalui `signInWithOAuth({ provider: 'google' })`.
- Konfigurasi provider Google sengaja ditunda sampai tahap deployment/domain production.
- Google OAuth tetap membutuhkan konfigurasi manual pada Supabase Dashboard dan Google Cloud. Detailnya ada di `supabase/README.md`.
- Publishable key boleh digunakan di frontend; jangan gunakan `secret` atau `service_role` key.

## Keputusan development lokal

- Login email/password dan fitur favorit digunakan untuk pengujian lokal.
- Google OAuth belum perlu diaktifkan selama aplikasi masih berjalan di localhost.
- Peta asli menggunakan provider free Leaflet/OpenStreetMap untuk tahap MVP.

## Catatan kerja untuk sesi berikutnya

Setiap task yang selesai harus dicatat kembali pada bagian `Progress project` di README ini agar konteks project tetap terbaca ketika percakapan atau model AI berganti.
