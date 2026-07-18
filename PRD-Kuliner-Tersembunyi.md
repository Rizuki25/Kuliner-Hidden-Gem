# PRD — Kuliner Tersembunyi

**Versi:** 0.1 (Draft)  
**Status:** Perencanaan  
**Platform:** Web responsif, mobile-first

## 1. Ringkasan Produk

Kuliner Tersembunyi adalah web publik yang membantu pengguna menemukan tempat makan lokal di sekitar mereka melalui peta interaktif, pencarian, filter, ulasan komunitas, dan rekomendasi tempat baru.

Pengunjung dapat melihat informasi kuliner tanpa membuat akun. Akun diperlukan untuk menyimpan favorit, memberi rating, menulis ulasan, atau mengusulkan tempat baru.

## 2. Latar Belakang dan Masalah

Orang yang berada di area baru sering kesulitan menemukan tempat makan yang sesuai dengan jarak, harga, status halal, dan jam buka.

Saat ini mereka biasanya mencari melalui Google Maps, media sosial, atau bertanya kepada teman. Informasi tersebut tersebar dan tidak selalu lengkap atau terbaru. Pengguna juga cenderung hanya menemukan tempat yang sudah populer, bukan kuliner lokal atau hidden gem.

## 3. Tujuan Produk

- Membantu pengguna menemukan kuliner yang sesuai dengan kebutuhan dan lokasi mereka.
- Menyediakan informasi tempat makan secara terpusat.
- Membangun katalog kuliner yang dapat diperbarui oleh komunitas.
- Menjaga kualitas data melalui proses moderasi admin.
- Memberikan kesempatan bagi pemilik usaha untuk mengelola profil bisnisnya.

## 4. Target Pengguna

### Pengunjung

Pengguna yang ingin mencari tempat makan tanpa membuat akun.

### Pengguna Terdaftar

Pengguna yang ingin menyimpan favorit, memberikan rating, menulis ulasan, atau mengusulkan tempat baru.

### Pemilik Usaha

Pemilik tempat kuliner yang ingin mengklaim dan mengelola profil bisnisnya.

### Admin

Pengelola aplikasi yang bertugas memverifikasi data, meninjau kontribusi, dan menghapus konten spam.

## 5. Ruang Lingkup Fitur

### Fase 1 — Peta dan Pencarian

Fitur utama:

- Peta kuliner interaktif.
- Menampilkan lokasi pengguna jika mendapat izin.
- Pencarian berdasarkan nama, alamat, atau kategori.
- Filter berdasarkan jarak, kategori, kisaran harga, status halal, dan jam buka.
- Halaman detail tempat kuliner.
- Informasi alamat, koordinat, foto, harga, status halal, jam buka, dan rating.
- Tombol untuk mendapatkan rute menuju lokasi.

Kriteria penerimaan:

- Pengguna dapat melihat daftar tempat dalam bentuk peta dan list.
- Hasil pencarian dapat difilter.
- Pengguna dapat membuka detail setiap tempat.
- Pengguna tetap dapat menggunakan aplikasi jika menolak akses lokasi dengan memilih lokasi secara manual.

### Fase 2 — Manajemen Favorit

Fitur utama:

- Menyimpan tempat ke favorit.
- Melihat daftar tempat favorit.
- Menghapus tempat dari favorit.

Kriteria penerimaan:

- Fitur favorit hanya tersedia bagi pengguna yang sudah login.
- Tempat yang disimpan muncul di halaman favorit.
- Pengguna dapat menghapus favorit kapan saja.

### Fase 3 — Autentikasi, Profil, dan Kontribusi

Fitur autentikasi:

- Daftar akun baru.
- Login dan logout.
- Pengaturan profil.
- Pemulihan kata sandi.

Fitur kontribusi:

- Mengusulkan tempat kuliner baru.
- Menulis ulasan dan memberikan rating.
- Melihat riwayat kontribusi.
- Melihat status usulan: menunggu, disetujui, atau ditolak.

Kriteria penerimaan:

- Pengguna harus login sebelum mengirim kontribusi.
- Usulan baru tidak langsung ditampilkan secara publik.
- Setiap kontribusi memiliki status moderasi.
- Pengguna dapat melihat kontribusi yang pernah dikirim.

### Fase 4 — Panel Admin

Fitur utama:

- Meninjau usulan tempat baru.
- Menyetujui atau menolak usulan.
- Mengedit data tempat.
- Menghapus tempat atau ulasan yang dianggap spam.
- Mengelola status dan informasi kuliner.

Kriteria penerimaan:

- Hanya akun admin yang dapat membuka panel admin.
- Admin dapat melihat detail setiap usulan.
- Data yang disetujui dapat muncul di halaman publik.
- Data yang ditolak tidak ditampilkan kepada publik.
- Admin dapat memberikan alasan penolakan.

Catatan: versi minimum panel admin perlu tersedia sebelum kontribusi pengguna dibuka untuk publik.

### Fase 5 — Klaim Bisnis

Fitur utama:

- Pemilik usaha mengajukan klaim kepemilikan.
- Admin memverifikasi kepemilikan.
- Pemilik mengelola profil tempat.
- Pemilik memperbarui jam buka, foto, deskripsi, dan informasi usaha.

Fitur ini direncanakan setelah fitur utama dan moderasi berjalan stabil.

## 6. Hak Akses Pengguna

| Aktivitas | Pengunjung | User | Pemilik Terverifikasi | Admin |
|---|---:|---:|---:|---:|
| Melihat peta dan tempat | Ya | Ya | Ya | Ya |
| Mencari dan memfilter | Ya | Ya | Ya | Ya |
| Mendapatkan rute | Ya | Ya | Ya | Ya |
| Menyimpan favorit | Tidak | Ya | Ya | Ya |
| Memberi rating dan ulasan | Tidak | Ya | Ya | Ya |
| Mengusulkan tempat | Tidak | Ya | Ya | Ya |
| Mengelola data tempat | Tidak | Tidak | Ya | Ya |
| Memoderasi konten | Tidak | Tidak | Tidak | Ya |

## 7. Alur Pengguna Utama

### Alur Pengunjung

1. Pengguna membuka web.
2. Pengguna mengizinkan lokasi atau memilih area secara manual.
3. Pengguna melihat peta dan daftar kuliner.
4. Pengguna menggunakan pencarian atau filter.
5. Pengguna membuka detail tempat.
6. Pengguna memilih tombol rute.

### Alur Pengguna Terdaftar

1. Pengguna membuat akun atau login.
2. Pengguna menyimpan tempat favorit, memberi ulasan, atau mengusulkan tempat baru.
3. Kontribusi masuk ke proses moderasi.
4. Pengguna dapat melihat status kontribusinya.

### Alur Admin

1. Admin login ke panel.
2. Admin meninjau usulan atau laporan.
3. Admin menyetujui, menolak, mengedit, atau menghapus konten.
4. Data yang disetujui ditampilkan di halaman publik.

## 8. Data yang Disimpan

Data utama yang diperlukan:

- Data pengguna.
- Data tempat kuliner.
- Koordinat dan alamat.
- Kategori dan kisaran harga.
- Status halal.
- Jam operasional.
- Foto tempat.
- Rating dan ulasan.
- Data favorit.
- Usulan tempat baru.
- Data klaim bisnis.
- Riwayat moderasi admin.

Maps API digunakan untuk peta, pencarian lokasi, geocoding, dan rute. Data aplikasi seperti favorit, ulasan, kontribusi, dan status moderasi disimpan di database aplikasi.

## 9. Kebutuhan Nonfungsional

- Web responsif dan nyaman digunakan di perangkat mobile.
- Pengguna dapat menggunakan fitur utama tanpa akun.
- Aplikasi tetap berfungsi jika izin lokasi ditolak.
- Informasi pribadi pengguna harus dilindungi.
- API key Maps harus dibatasi berdasarkan domain dan penggunaan.
- Kontribusi pengguna harus melalui moderasi.
- Sistem perlu memiliki pembatasan spam dan laporan konten.

## 10. Indikator Keberhasilan

- Pengguna berhasil menemukan detail tempat setelah melakukan pencarian.
- Pengguna menekan tombol rute setelah melihat detail tempat.
- Jumlah tempat kuliner yang tersedia terus bertambah.
- Jumlah pengguna yang kembali menggunakan aplikasi meningkat.
- Usulan tempat baru memiliki tingkat persetujuan yang baik.
- Jumlah konten spam atau data tidak valid tetap rendah.

## 11. Di Luar Ruang Lingkup MVP

Fitur berikut belum menjadi prioritas:

- Pemesanan makanan.
- Pembayaran online.
- Layanan pesan-antar.
- Reservasi meja.
- Iklan berbayar.
- Sistem loyalty atau poin.
- Analitik bisnis lanjutan untuk pemilik usaha.

## 12. Definisi MVP

MVP dianggap selesai apabila pengguna dapat:

1. Membuka web tanpa login.
2. Melihat peta tempat kuliner.
3. Mencari dan memfilter tempat.
4. Melihat detail tempat.
5. Mendapatkan rute.
6. Login untuk menyimpan favorit.
7. Admin menambahkan, mengedit, dan menghapus data tempat.
8. Admin memoderasi usulan pengguna.

## 13. Keputusan yang Masih Perlu Ditentukan

- Kota atau wilayah peluncuran pertama.
- Penyedia Maps API yang akan digunakan.
- Metode login: email, Google, atau pilihan lain.
- Definisi dan sumber informasi status halal.
- Standar kategori harga.
- Mekanisme verifikasi pemilik usaha.
- Aturan dan batasan rating atau ulasan.
