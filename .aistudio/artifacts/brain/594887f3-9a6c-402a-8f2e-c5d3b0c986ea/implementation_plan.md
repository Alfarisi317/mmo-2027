# Rencana Implementasi: Penghapusan Fitur Coretan Rumus, Label Fokus Pilar Soal, dan Opsi Babak Final

Rencana ini merinci langkah-langkah penyederhanaan antarmuka MMO 2027 sesuai arahan pengguna:
1. Menghapus fitur kanvas **Coretan Rumus** dari lembar ujian peserta (tetap mempertahankan navigasi nomor dan kalkulator saintifik).
2. Menghapus label/keterangan fokus pilar (**Explore**, **Think**, **Excel**) pada tampilan butir soal peserta maupun daftar bank soal panitia. Header soal difokuskan hanya pada Nomor Soal, Domain Matematika, dan Bobot Poin.
3. Menghapus kolom pilihan **Fokus Karakter** pada formulir penambahan/input soal baru di dasbor panitia.
4. Menghapus seluruh opsi dan referensi **Babak Final** dari sistem (pada tipe data, filter, formulir tambah peserta, dan formulir soal), sehingga sistem secara terpusat hanya melayani **Babak Penyisihan** dan **Babak Semifinal**.

---

## Hasil Konfirmasi Pengguna (Phase 1 Q&A)
- **Alat Bantu yang Dipertahankan**: Hanya navigasi nomor soal dan kalkulator saintifik (kanvas coretan rumus dihapus sepenuhnya).
- **Tampilan Header Kartu Soal**: Hanya menampilkan nomor soal, domain matematika (Aljabar, Geometri, Kombinatorika, Teori Bilangan), dan bobot penskoran (+4 / -1 / 0 atau +10 / 0).

---

## 1. Penghapusan Fitur Coretan Rumus (`ExamRoom.tsx` & `QuestionCard.tsx`)
- **Pembersihan pada Komponen `QuestionCard.tsx`**:
  - Menghapus tombol **"Coretan Rumus"** (`PenTool` icon) dari header kartu soal.
  - Menghapus referensi prop `onOpenScratchpad`.
- **Pembersihan pada Komponen `ExamRoom.tsx`**:
  - Menghapus import `ScratchpadModal` dan state `isScratchpadOpen`.
  - Menghapus rendering `<ScratchpadModal />` dari modal tree.
  - Memastikan antarmuka ruang ujian tetap ringan, responsif, dan fokus pada pembacaan soal serta pengisian jawaban.

---

## 2. Penghapusan Keterangan Explore / Think / Excel pada Soal
- **Header Kartu Soal (`QuestionCard.tsx`)**:
  - Menghapus badge babak yang memuat fokus pilar, misalnya: `Babak Penyisihan (Explore)` atau `(Think + Excel)`.
  - Tata letak header soal kini bersih dan minimalis:
    - Kiri: **Nomor Soal** (misal: *Nomor 1 / 30*) dan **Domain Materi** (misal: *Aljabar*).
    - Kanan: **Bobot Poin** standar resmi (+4 / -1 / 0).
- **Pembersihan Label di Manajemen Soal Panitia (`ProctorDashboard.tsx`)**:
  - Menghapus badge fokus pilar pada daftar kartu pratinjau soal di Dasbor Pengawas.
  - Menghapus label uraian babak final dari input esai singkat.

---

## 3. Penghapusan Input Fokus Karakter pada Form Bank Soal (`ProctorDashboard.tsx`)
- **Formulir Tambah Soal Baru**:
  - Menghapus dropdown/pilihan **"Fokus Karakter"** (`Explore`, `Explore + Think`, `Think + Excel`).
  - Menata ulang grid input metadata soal (Kategori, Babak, Bidang Materi, Jenis Soal) agar proporsional dan rapi.
- **Server Word Parser (`server.ts`)**:
  - Menyesuaikan prompt AI ekstraksi naskah Word agar tidak lagi mewajibkan field `focus`.

---

## 4. Penghapusan Opsi & Referensi Babak Final
- **Definisi Tipe Data (`src/types/index.ts`)**:
  - Memperbarui `CompetitionStage` menjadi:
    ```typescript
    export type CompetitionStage = 'Penyisihan' | 'Semifinal';
    ```
  - Menghapus `'Final'` dari daftar stage resmi kompetisi web.
- **Pembaruan Dropdown & Filter pada `ProctorDashboard.tsx`**:
  - Dropdown pilihan babak pada Form Tambah Peserta Manual: hanya **Penyisihan** dan **Semifinal**.
  - Dropdown pilihan babak pada Form Tambah Soal: hanya **Penyisihan** dan **Semifinal**.
  - Dropdown filter babak pada Live Monitoring: hanya **Semua Babak**, **Penyisihan**, dan **Semifinal**.
  - Dropdown filter babak pada Rekap Peringkat Nilai: hanya **Semua Babak**, **Penyisihan**, dan **Semifinal**.
  - Dropdown filter babak pada Tabel Data Pendaftaran: hanya **Semua Babak**, **Penyisihan**, dan **Semifinal**.
- **Pembersihan Teks Lembar Ujian**:
  - Menghapus label teks bertuliskan *"Babak Final"* pada tipe soal uraian singkat, diselaraskan dengan babak yang berlaku.

---

## 5. Diagram Alur & Arsitektur Antarmuka yang Disederhanakan

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LEMBAR UJIAN PESERTA                           │
├────────────────────────────────────────────────────────────────────────┤
│ [Header] Nomor 1 / 30  ·  Aljabar  ·  (+4 / -1 / 0)                   │
│ (Tanpa tombol Coretan Rumus, Tanpa label Explore/Think/Excel)          │
├────────────────────────────────────────────────────────────────────────┤
│ Teks Soal Matematika (KaTeX LaTeX)                                     │
│ Opsi Pilihan Ganda (A, B, C, D, E)                                     │
├────────────────────────────────────────────────────────────────────────┤
│ Navigasi: [◄ Sebelumnya]  [Ragu-ragu]  [Selanjutnya ►]                │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                      DASBOR PENGAWAS PANITIA                           │
├────────────────────────────────────────────────────────────────────────┤
│ 4 Saklar Akses Soal:                                                  │
│ 1. SMP Penyisihan  2. SMP Semifinal  3. SMA Penyisihan  4. SMA Semifinal│
│ (Tidak ada Babak Final)                                               │
├────────────────────────────────────────────────────────────────────────┤
│ Form Input Soal Baru:                                                  │
│ [Jenjang: SMP/SMA]  [Babak: Penyisihan/Semifinal]  [Bidang Materi]     │
│ (Kolom Fokus Karakter Telah Dihapus)                                   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Rencana Verifikasi
1. **Verifikasi Lembar Ujian**:
   - Masuk ke sesi ujian peserta (`ExamRoom`), pastikan tombol "Coretan Rumus" sudah tidak muncul dan modal coretan tidak dapat diakses.
   - Periksa header kartu soal: hanya ada nomor soal, bidang materi, dan bobot poin (tidak ada teks Explore/Think/Excel).
2. **Verifikasi Bank Soal & Input Panitia**:
   - Buka Dasbor Pengawas tab *Kelola Bank Soal*, pastikan kolom *Fokus Karakter* sudah hilang dari formulir tambah soal.
   - Pastikan opsi babak di semua form dan filter hanya menampilkan *Penyisihan* dan *Semifinal*.
3. **Verifikasi Build & Tipe Data**:
   - Jalankan `lint_applet` (`tsc --noEmit`) untuk memastikan perubahan tipe `CompetitionStage` tidak memicu error kompilasi.
   - Jalankan `compile_applet` untuk memastikan produksi aplikasi berhasil 100%.
