# Workflow — Kuliner Tersembunyi

**Versi:** 0.1  
**Status:** Draft  
**Dokumen terkait:** `PRD-Kuliner-Tersembunyi.md`

## 1. Prinsip Umum

- Pengunjung dapat melihat dan mencari tempat kuliner tanpa membuat akun.
- Akun diperlukan untuk menyimpan favorit, memberi rating, menulis ulasan, dan mengusulkan tempat baru.
- Kontribusi pengguna tidak langsung dipublikasikan sebelum ditinjau admin.
- Hanya admin yang dapat mengubah status publikasi atau menghapus konten.
- Pemilik usaha hanya dapat mengelola profil setelah klaim kepemilikan diverifikasi.

## 2. Peran Pengguna

| Peran | Kemampuan utama |
|---|---|
| Pengunjung | Melihat peta, mencari, memfilter, melihat detail, dan mendapatkan rute |
| User | Semua kemampuan pengunjung, ditambah favorit dan kontribusi |
| Pemilik terverifikasi | Mengelola profil tempat yang telah diklaim |
| Admin | Mengelola data tempat, pengguna, kontribusi, dan moderasi |

## 3. Workflow Pengunjung Menemukan Kuliner

```text
Pengguna membuka web
        ↓
Memilih izin lokasi atau memilih area secara manual
        ↓
Melihat peta dan daftar tempat kuliner
        ↓
Mencari berdasarkan kata kunci atau kategori
        ↓
Menggunakan filter jarak, harga, halal, dan jam buka
        ↓
Membuka detail tempat
        ↓
Memilih "Dapatkan Rute"
        ↓
Membuka navigasi menuju lokasi
```

### Kondisi alternatif

- Jika pengguna menolak izin lokasi, aplikasi menampilkan pilihan lokasi manual.
- Jika tidak ada hasil, aplikasi menampilkan pesan dan menyarankan perubahan kata kunci atau filter.
- Jika lokasi tidak memiliki data kuliner, aplikasi dapat menawarkan area terdekat.
- Jika data jam buka tidak tersedia, aplikasi menampilkan status "Jam buka belum tersedia".

## 4. Workflow Pencarian dan Filter

1. Pengguna memasukkan kata kunci, seperti nama makanan, nama tempat, atau kategori.
2. Sistem mencari tempat yang sesuai.
3. Pengguna memilih filter yang tersedia.
4. Sistem memperbarui daftar dan marker pada peta.
5. Pengguna dapat mengurutkan hasil berdasarkan jarak atau rating.
6. Pengguna memilih salah satu tempat untuk melihat detail.

### Aturan pencarian

- Pencarian tidak membedakan huruf besar dan kecil.
- Hasil dapat dicari berdasarkan nama, alamat, atau kategori.
- Tempat yang berstatus `approved` saja yang ditampilkan kepada publik.
- Filter yang tidak memiliki hasil harus menampilkan keadaan kosong yang informatif.

## 5. Workflow Login dan Registrasi

```text
Pengguna memilih fitur yang membutuhkan akun
        ↓
Sistem menampilkan pilihan masuk atau daftar
        ↓
Pengguna mengisi data akun
        ↓
Sistem memvalidasi data
        ↓
Akun berhasil dibuat atau pengguna berhasil masuk
        ↓
Pengguna dikembalikan ke fitur yang sebelumnya dipilih
```

### Aturan autentikasi

- Pengguna yang belum login tetap dapat melihat konten publik.
- Pengguna harus login sebelum menyimpan favorit atau mengirim kontribusi.
- Data login yang tidak valid menampilkan pesan kesalahan yang jelas.
- Pengguna dapat logout dari menu profil.
- Pengguna dapat meminta pemulihan kata sandi.

## 6. Workflow Manajemen Favorit

### Menyimpan favorit

1. User membuka detail tempat.
2. User memilih tombol "Simpan ke Favorit".
3. Sistem menyimpan tempat ke akun user.
4. Tombol berubah menjadi status "Tersimpan".

### Melihat dan menghapus favorit

1. User membuka halaman favorit.
2. Sistem menampilkan seluruh tempat yang tersimpan.
3. User memilih salah satu tempat untuk melihat detail atau rute.
4. User memilih "Hapus dari Favorit" jika ingin menghapusnya.

### Kondisi alternatif

- Jika pengunjung belum login, sistem mengarahkan ke halaman login.
- Jika tempat sudah tersimpan, sistem tidak membuat data favorit duplikat.
- Jika tempat sudah tidak aktif, sistem menandai atau menyembunyikannya dari daftar favorit.

## 7. Workflow Usulan Tempat Baru

```text
User login
        ↓
Memilih "Usulkan Tempat Baru"
        ↓
Mengisi nama, kategori, alamat, koordinat, harga, halal, jam buka, dan foto
        ↓
Sistem memvalidasi data wajib
        ↓
Usulan disimpan dengan status `pending`
        ↓
Admin meninjau usulan
        ↓
Disetujui → tempat tampil publik
Ditolak   → tidak tampil dan alasan tersimpan
```

### Aturan usulan tempat

- Nama dan lokasi wajib diisi.
- Sistem harus mencegah atau memberi peringatan untuk tempat duplikat.
- Foto dan deskripsi harus mengikuti batasan ukuran serta format yang ditentukan.
- User dapat melihat status usulan melalui riwayat kontribusi.
- Usulan yang ditolak dapat menampilkan alasan penolakan kepada pengusul.

## 8. Workflow Rating dan Ulasan

1. User login dan membuka detail tempat.
2. User memilih rating antara 1 sampai 5.
3. User menulis ulasan.
4. Sistem memvalidasi isi ulasan.
5. Ulasan disimpan dan ditampilkan sesuai aturan moderasi.
6. Nilai rating rata-rata tempat diperbarui.

### Aturan ulasan

- Satu user dapat memiliki satu ulasan aktif untuk satu tempat.
- User dapat memperbarui atau menghapus ulasannya sendiri.
- Admin dapat menyembunyikan ulasan yang mengandung spam atau pelanggaran.
- Rating tidak boleh dikirim tanpa memilih nilai rating.

## 9. Workflow Moderasi Admin

```text
Admin login
        ↓
Membuka daftar usulan, ulasan, atau laporan
        ↓
Memeriksa data, lokasi, foto, dan isi kontribusi
        ↓
Memilih tindakan
        ├── Setujui → konten tampil publik
        ├── Tolak → konten tidak dipublikasikan
        ├── Edit → data diperbaiki lalu disimpan
        └── Hapus → konten dihapus atau diarsipkan
```

### Status konten

| Status | Arti |
|---|---|
| `pending` | Menunggu pemeriksaan admin |
| `approved` | Disetujui dan dapat tampil publik |
| `rejected` | Ditolak dan tidak tampil publik |
| `archived` | Tidak aktif atau disembunyikan |

### Aturan moderasi

- Admin harus dapat melihat siapa pengusul dan kapan kontribusi dibuat.
- Penolakan sebaiknya menyimpan alasan.
- Setiap perubahan penting dicatat dalam riwayat moderasi.
- Konten yang dihapus sebaiknya diarsipkan terlebih dahulu agar dapat ditinjau kembali.

## 10. Workflow Klaim Bisnis

```text
Pemilik membuat akun atau login
        ↓
Membuka halaman tempat kuliner
        ↓
Memilih "Ajukan Klaim"
        ↓
Mengisi data kontak dan bukti kepemilikan
        ↓
Klaim berstatus `pending`
        ↓
Admin memeriksa bukti
        ├── Disetujui → pemilik dapat mengelola profil
        └── Ditolak → pemilik menerima alasan penolakan
```

Setelah klaim disetujui, pemilik dapat memperbarui informasi yang diizinkan, seperti deskripsi, foto, jam buka, nomor kontak, dan tautan usaha. Perubahan penting tetap dapat memerlukan moderasi admin.

## 11. Workflow Pelaporan Konten

1. Pengguna membuka tempat atau ulasan yang bermasalah.
2. Pengguna memilih "Laporkan".
3. Pengguna memilih alasan laporan.
4. Sistem menyimpan laporan dengan status `pending`.
5. Admin meninjau laporan.
6. Admin dapat mengabaikan laporan, menyembunyikan konten, mengedit data, atau mengarsipkan konten.

## 12. Aturan Publikasi Data

- Tempat yang dimasukkan admin dapat langsung berstatus `approved` setelah validasi.
- Tempat yang diusulkan user berstatus `pending` sampai disetujui admin.
- Ulasan dan foto kontribusi mengikuti aturan moderasi.
- Data tempat yang sudah tidak aktif sebaiknya diubah menjadi `archived`, bukan langsung dihapus.
- Data publik harus memiliki sumber atau catatan verifikasi jika memungkinkan.

## 13. Ketergantungan Workflow

```text
Peta & Pencarian
        ↓
Autentikasi & Profil
        ↓
Favorit dan Kontribusi Pengguna
        ↓
Panel Admin dan Moderasi
        ↓
Klaim Bisnis
```

Walaupun panel admin berada di fase berikutnya pada roadmap, fitur moderasi minimum harus tersedia sebelum kontribusi pengguna dibuka secara luas.

## 14. Kondisi Error yang Perlu Ditangani

- Maps API tidak dapat dimuat.
- Lokasi pengguna tidak tersedia.
- Pencarian tidak menghasilkan data.
- Koneksi internet terputus.
- Data tempat gagal disimpan.
- Foto terlalu besar atau format tidak didukung.
- Pengguna belum login saat mengakses fitur terbatas.
- Usulan atau ulasan gagal dikirim.

Setiap kondisi error harus menampilkan pesan yang mudah dipahami dan pilihan tindakan berikutnya.

## 15. Definition of Done Workflow

Workflow dianggap siap diimplementasikan apabila:

- Setiap peran memiliki hak akses yang jelas.
- Pengunjung dapat mencari kuliner tanpa login.
- Fitur yang membutuhkan akun memiliki pengalihan login yang jelas.
- Setiap kontribusi memiliki status moderasi.
- Admin dapat menyetujui, menolak, mengedit, dan mengarsipkan konten.
- Alur klaim bisnis tidak dapat melewati proses verifikasi.
- Kondisi kosong dan error utama sudah memiliki rancangan tampilan.
