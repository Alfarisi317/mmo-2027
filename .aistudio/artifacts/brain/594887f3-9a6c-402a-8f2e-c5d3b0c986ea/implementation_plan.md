# Relokasi Tombol Selesai Mobile & Fitur Uji Coba 3 Soal di Ruang Tunggu

Rencana optimasi antarmuka ujian untuk peserta pengguna ponsel (HP) melalui bilah aksi bawah tetap (*sticky bottom action bar*) agar tombol **Selesai Ujian** mudah dijangkau dan terlihat jelas, serta penambahan fitur **Uji Coba 3 Soal Simulasi Mandiri** di Ruang Tunggu Ujian MMO 2027 sebelum akses soal resmi dibuka panitia.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan klarifikasi yang telah dikonfirmasi oleh pengguna:
> 1. **Posisi Tombol Selesai Ujian di Layar HP**: Ditempatkan pada **bilah aksi tetap di bagian bawah layar HP (*sticky bottom bar*)** dengan kontras tegas dan indikator jumlah soal terjawab, sehingga mudah ditekan ibu jari tanpa perlu menggulir ke atas atau membuka menu lain. Tampilan di laptop tetap proporsional di header atas dan panel navigasi kanan.
> 2. **Format & Alur Uji Coba 3 Soal**: Berupa **uji coba mandiri tanpa penilaian resmi yang dapat diulang kapan saja** langsung dari Ruang Tunggu Ujian. Menampilkan 3 variasi soal matematika KaTeX (Aljabar, Teori Bilangan/Geometri, Kombinatorika) agar siswa terbiasa dengan format opsi, navigasi, dan kanvas coretan.

---

## 1. Overview & Core Concept

- **Apa yang Dibangun**:
  1. **Bilah Aksi Bawah Mobile (*Sticky Bottom Action Bar*)**: Komponen navigasi bawah khusus layar ponsel/tablet (`lg:hidden`) yang selalu terlihat (*sticky* di dasar layar). Menyediakan tombol "Sebelumnya", "Nomor/Palet", "Ragu", dan tombol **"Selesai Ujian"** berwarna tegas (#646464 / zinc-900) dengan konfirmasi ringkasan soal.
  2. **Modul Uji Coba 3 Soal Simulasi di Ruang Tunggu**: Kartu dan modal interaktif di Ruang Tunggu Ujian yang memungkinkan peserta mencoba menjawab 3 contoh soal olimpiade berformat LaTeX KaTeX, menguji tombol ragu-ragu, mencoba kanvas coretan, dan mengulang latihan secara bebas sembari menanti panitia membuka gerbang ujian.
- **Target Pengguna**: Peserta MMO 2027 (tingkat SMP dan SMA) yang menggunakan perangkat ponsel (HP) maupun laptop.
- **Nilai Utama**: Menghilangkan kebingungan peserta di layar ponsel saat ingin menyelesaikan ujian, serta meningkatkan rasa percaya diri dan adaptasi siswa terhadap sistem ujian digital sebelum waktu mulai.

---

## 2. User Experience & Visual Design

### Alur Peserta di Layar HP & Ruang Tunggu
1. **Di Ruang Tunggu Ujian (Setelah Login)**:
   - Peserta melihat status server (*Menunggu Pembukaan Akses oleh Panitia*).
   - Di bawah profil peserta, terdapat kartu khusus bertajuk:
     **"Uji Coba Tampilan & Simulasi Soal (3 Soal Latihan)"**
     Lengkap dengan badge *Latihan Mandiri · Tanpa Penilaian Resmi*.
   - Peserta mengetuk tombol **"Mulai Uji Coba (3 Soal)"**.
   - Terbuka antarmuka simulasi 3 soal dengan rumus matematika KaTeX tajam, pilihan ganda A–E, tombol ragu, kanvas coretan, dan tombol "Selesai Simulasi".
   - Setelah simulasi, muncul dialog ringkasan ramah yang mengonfirmasi kesiapan teknis peserta, dengan opsi "Ulangi Latihan" atau "Kembali ke Ruang Tunggu".
   - Polling server tetap aktif di latar belakang sehingga jika panitia membuka gerbang ujian saat siswa mencoba soal, sistem akan segera memberi tahu atau melanjutkan secara mulus.

2. **Saat Mengerjakan Soal Resmi di Layar Ponsel (HP)**:
   - Di bagian atas layar HP: Tampilan nama peserta, sisa waktu hitung mundur, dan status penyimpanan lokal/server.
   - Di area konten: Kartu soal KaTeX dan opsi ganda A–E yang dapat digulir dengan nyaman, dengan bantalan bawah (*padding-bottom*) yang cukup agar konten tidak tertutup bilah navigasi.
   - Di bagian bawah layar HP: **Bilah aksi bawah tetap (*sticky bottom bar*)** dengan komposisi:
     - Tombol navigasi **Sebelumnya** & **Selanjutnya**.
     - Tombol cepat **Buka Nomor Soal (Palet)** dengan indikator jumlah terisi (misal: `18/20`).
     - Tombol mencolok **"Selesai Ujian"** dengan ikon centang dan latar gelap khas MMO (`bg-[#646464]` atau `bg-zinc-900`), yang saat diketuk akan memunculkan dialog konfirmasi pengumpulan jawaban.
   - Di layar laptop / desktop: Tata letak tetap elegan dan rapi, dengan tombol "Kumpulkan Ujian" di header atas dan di bawah grid palet nomor pada kolom kanan.

### Palet Warna & Desain Visual
- **Tema Identitas**: Abu-abu netral (#646464 & #D5D5D5), aksen putih (#ffffff) dan latar canvas bersih (#fafafa).
- **Sticky Bar Mobile**: `fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#D5D5D5] px-3.5 py-2.5 shadow-lg flex items-center justify-between gap-2`.
- **Badge & Status**: Hijau zamrud (Tersimpan Lokal), Amber (Ragu-ragu), Abu-abu arang (Tombol Aksi Utama).

---

## 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Bilah Bawah Tetap (*Fixed/Sticky Bottom Bar*) vs Tombol Mengambang (Floating Action Button)**:
  - *Pilihan Terpilih*: Bilah bawah tetap terstruktur yang memadukan tombol aksi navigasi (Prev/Next/Nomor) berdampingan dengan tombol "Selesai Ujian".
  - *Alasan*: Floating button sering menutupi teks pilihan ganda atau diagram matematika di HP, sedangkan sticky bottom bar memberikan area sentuh jempol yang stabil dan ergonomis.
- **Keputusan 2: Penyimpanan Jawaban Uji Coba**:
  - *Pilihan Terpilih*: State jawaban uji coba dikelola di memori lokal React (*in-memory*) dan tidak pernah dikirim ke database backend.
  - *Alasan*: Menjaga server tetap ringan (bebas beban resource) untuk 200+ peserta bersamaan dan memastikan tidak terjadi tumpang tindih data antara soal simulasi dan soal ujian resmi.
- **Keputusan 3: Penanganan Polling Gerbang saat Siswa di Modal Uji Coba**:
  - *Pilihan Terpilih*: Modal uji coba mendengarkan status gerbang ujian. Jika panitia menekan tombol "Buka Ujian", modal akan menampilkan notifikasi bahwa gerbang telah dibuka dan otomatis menutup simulasi untuk beralih ke ujian resmi.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MMO 2027 WAITING ROOM & EXAM                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┴─────────────────────────────┐
         ▼                                                          ▼
┌───────────────────────────────────┐      ┌──────────────────────────────────┐
│   LandingPortal / Ruang Tunggu    │      │             ExamRoom             │
│  - Info Peserta & Status Gerbang  │      │  - Active Questions & Timer      │
│  - Tombol [Uji Coba 3 Soal]       │      │  - Client-side AntiCheat         │
└─────────────────┬─────────────────┘      └────────────────┬─────────────────┘
                  │                                         │
                  ▼                                         ▼
┌───────────────────────────────────┐      ┌──────────────────────────────────┐
│          TrialExamModal           │      │     Responsive Layout Engine     │
│  - 3 Soal KaTeX (Aljabar,         │      │  - Desktop (lg:): Header +       │
│    Bilangan, Kombinatorika)       │      │    Sidebar Question Palette      │
│  - Opsi Interaktif & Coretan      │      │  - Mobile (< lg): Sticky Bottom  │
│  - Mode Ulangi Kapan Saja         │      │    Bar [Prev | No | Ragu |       │
│  - Auto-exit jika Ujian Dibuka    │      │    ★ Selesai Ujian]              │
└───────────────────────────────────┘      └──────────────────────────────────┘
```

### Komponen yang Dimodifikasi & Dibuat:
1. `src/data/trialQuestions.ts`:
   - 3 set soal matematika representatif dengan rumus KaTeX lengkap, kategori SMP & SMA yang adaptif.
2. `src/components/TrialExamModal.tsx`:
   - Komponen modal interaktif layar penuh/terpusat untuk menjalankan simulasi 3 soal.
   - Mendukung pemilihan jawaban, navigasi nomor 1–3, rumus KaTeX, dan tombol selesai simulasi.
3. `src/components/LandingPortal.tsx`:
   - Penambahan kartu ajakan uji coba di dalam Ruang Tunggu (`waitingParticipant`).
   - Handler untuk membuka dan menutup `TrialExamModal`.
4. `src/components/ExamRoom.tsx`:
   - Penambahan `MobileExamBottomBar` yang terpasang tetap di bagian bawah (`fixed bottom-0 lg:hidden`).
   - Memberikan padding bawah tambahan pada `<main>` di tampilan mobile (`pb-24`) agar seluruh konten soal dan opsi dapat digulir bebas tanpa terhalang bar bawah.
   - Memastikan tombol "Selesai Ujian" di bilah bawah langsung memicu `setShowSubmitModal(true)` dengan dialog konfirmasi yang jelas.

---

## Verification Plan

### Pengujian Otomatis & Kompilasi
- Menjalankan `compile_applet` untuk memastikan tidak ada kesalahan tipe TypeScript maupun impor modul.
- Menjalankan `lint_applet` untuk memeriksa kepatuhan sintaks ESLint.

### Pengujian Fungsional Antarmuka
1. **Layar HP (Mobile Viewport < 1024px)**:
   - Verifikasi bilah bawah muncul di bagian bawah layar saat ujian berlangsung.
   - Pastikan tombol "Selesai" terlihat jelas, berukuran ramah sentuh (*touch target* >= 44px), dan memunculkan modal konfirmasi saat diklik.
   - Pastikan kartu soal terakhir dan opsi pilihan tidak tertutup oleh bilah bawah (*padding-bottom check*).
2. **Layar Laptop / Komputer (Desktop Viewport >= 1024px)**:
   - Verifikasi bilah bawah tersembunyi secara otomatis (`lg:hidden`).
   - Tombol "Kumpulkan Ujian" tetap berada di header atas dan panel palet sebelah kanan.
3. **Uji Coba 3 Soal di Ruang Tunggu**:
   - Masuk sebagai peserta ke Ruang Tunggu.
   - Buka menu "Uji Coba Tampilan & Simulasi Soal".
   - Jawab 3 soal simulasi, navigasikan nomor, coba tombol ragu-ragu dan coretan rumus.
   - Selesaikan simulasi, verifikasi pesan selesai, dan coba fitur "Ulangi Latihan".
   - Pastikan status gerbang panitia tetap dipantau secara real-time.
