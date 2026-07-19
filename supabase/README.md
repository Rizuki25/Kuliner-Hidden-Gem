# Supabase

Migration awal untuk MVP Kuliner Tersembunyi berada di:

`supabase/migrations/202607180001_initial_schema.sql`

Migration lanjutan untuk foto kontribusi berada di:

`supabase/migrations/202607180002_contribution_photos.sql`

Hotfix akses foto approved untuk pengunjung berada di:

`supabase/migrations/202607190001_public_approved_photo_access.sql`

Jika signed URL masih mengembalikan `Object not found` untuk pengunjung, jalankan juga:

`supabase/migrations/202607190002_public_approved_photo_policy_definer.sql`

Migration klaim bisnis, bucket bukti kepemilikan, dan policy manager berada di:

`supabase/migrations/202607190003_business_claim_proofs_and_manager_policies.sql`

## Isi schema

| Tabel | Fungsi |
| --- | --- |
| `profiles` | Profil user dan role `user`, `owner`, `admin` |
| `places` | Katalog tempat kuliner publik |
| `place_hours` | Jam buka per hari |
| `place_photos` | Foto tempat yang sudah masuk katalog |
| `favorites` | Tempat favorit milik user |
| `reviews` | Rating dan ulasan dengan status moderasi |
| `place_submissions` | Usulan tempat baru dari user |
| `place_submission_hours` | Jam buka pada usulan tempat |
| `place_submission_photos` | Foto pada usulan tempat |
| `moderation_logs` | Riwayat aksi moderasi admin |
| `content_reports` | Laporan tempat, ulasan, atau foto |
| `business_claims` | Pengajuan klaim kepemilikan bisnis |
| `place_managers` | Pemilik terverifikasi yang dapat mengelola tempat |

## Aturan penting

- Tempat publik hanya terbaca jika `publication_status = 'approved'`.
- Usulan user selalu dimulai dari status `pending`.
- Ulasan publik hanya terlihat setelah status `approved`.
- User hanya dapat membaca atau mengubah data miliknya sendiri.
- Admin memiliki akses moderasi penuh.
- Approval klaim bisnis otomatis membuat record `place_managers` dan mengubah role user menjadi `owner`.
- Bukti klaim bisnis disimpan di bucket private `business-claim-proofs`; folder teratas wajib sama dengan `auth.uid()`, dan admin dapat membuat signed URL untuk meninjaunya.
- Manager terverifikasi dapat memperbarui data `places`, `place_hours`, dan `place_photos` sesuai policy. UI pengelolaan detail owner akan ditambahkan pada subtahap berikutnya.
- Foto usulan disimpan di bucket private `place-submission-photos`. Folder teratas wajib sama dengan `auth.uid()`; user hanya dapat membaca foto miliknya, admin dapat membaca semua, dan foto yang sudah dipromosikan ke `place_photos` dapat dibuatkan signed URL untuk publik.
- Foto pada `place_photos` dengan status approved dan tempat approved dapat dibuatkan signed URL oleh pengunjung tanpa login; foto pending tetap tidak dapat dibaca publik.
- `halal_status` memiliki nilai `halal`, `non_halal`, dan `belum_terverifikasi`. Nilai ketiga menjaga agar data yang belum diverifikasi tidak dipaksa masuk ke label yang salah.
- `day_of_week` menggunakan format PostgreSQL: `0` Minggu sampai `6` Sabtu.

## Menjalankan migration

Cara yang direkomendasikan setelah Supabase CLI dan project sudah terhubung:

```bash
supabase db push
```

Untuk tahap awal, migration juga dapat ditempel dan dijalankan melalui Supabase Dashboard → SQL Editor. Setelah database dibuat, tahap berikutnya adalah mengisi `.env.local`, membuat seed data Bandung, lalu mengganti data dummy React dengan query Supabase.

## Seed data demo

Data contoh fiktif untuk pengujian tersedia di `supabase/seed.sql`. Jalankan file tersebut melalui SQL Editor setelah migration berhasil. Seed menggunakan `slug` sebagai conflict key sehingga aman dijalankan ulang selama project masih memakai data demo.

Jalankan migration foto setelah migration awal. Setelah itu, atur role admin secara manual karena role tidak boleh berasal dari metadata pendaftaran:

```sql
update public.profiles
set role = 'admin'
where id = '<user_id_dari_auth_users>';
```

Panel moderasi frontend tersedia di `/admin`. User dapat melihat riwayat kontribusi di `/kontribusi`.

Jalankan migration klaim bisnis setelah migration foto dan hotfix foto publik. Form klaim tersedia pada halaman detail tempat ketika user sudah login. Admin meninjaunya dari bagian **Klaim bisnis** di `/admin`.

## Konfigurasi Google OAuth

Alur Google OAuth sudah tersedia di frontend. Provider tetap perlu diaktifkan satu kali:

1. Buat OAuth Client ID tipe **Web application** di Google Cloud / Google Auth Platform.
2. Pada Authorized JavaScript origins, tambahkan `http://localhost:5173` untuk development.
3. Pada Authorized redirect URIs Google, tambahkan callback Supabase:
   `https://pwuxtuyznawdexivklft.supabase.co/auth/v1/callback`
4. Buka Supabase Dashboard → Authentication → Providers → Google.
5. Aktifkan provider tersebut dan masukkan Client ID serta Client Secret.
6. Buka Authentication → URL Configuration dan tambahkan `http://localhost:5173/` ke redirect URLs.

Frontend memanggil `signInWithOAuth` dan mengarahkan user kembali ke halaman utama setelah login berhasil. Untuk production, tambahkan domain production pada Google Cloud dan Supabase URL Configuration.
