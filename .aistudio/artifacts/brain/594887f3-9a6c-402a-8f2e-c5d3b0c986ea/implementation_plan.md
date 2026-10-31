# Rencana Implementasi: Tombol Pemilih Jenjang (SMP/SMA) & Babak (Penyisihan/Semifinal)

Berdasarkan klarifikasi pengguna, sistem akan menambahkan tombol interaktif yang jelas dan mudah diakses untuk membedakan serta memilih **Jenjang (SMP vs SMA)** dan **Babak (Penyisihan vs Semifinal)** pada formulir login peserta, ruang tunggu pra-ujian, serta dasbor pengawas panitia.

---

## 1. Halaman Masuk Akun Ujian & Ruang Tunggu (`src/components/LandingPortal.tsx`)
- **Bilah Pemilih Interaktif di Form Login (Tahap 3)**:
  - Tombol toggle segmen **Pilih Jenjang**:
    - `SMP / MTs` (Ikon edukasi, warna aksen Sky Blue `#83B9DF`, fondasi Iron Gate `#53585E`)
    - `SMA / MA / SMK`
  - Tombol toggle segmen **Pilih Babak Ujian**:
    - `Babak Penyisihan` (Tahap 1 - Seleksi Awal & Eksplorasi)
    - `Babak Semifinal` (Tahap 2 - Penalaran Tingkat Lanjut)
  - Desain tombol interaktif dengan animasi hover halus, elevasi `hover:-translate-y-0.5`, dan glow lembut `hover:shadow-[0_8px_25px_rgba(131,185,223,0.3)]`.
  - Integrasi cerdas: Jika peserta memilih akun dari daftar demo/pendaftaran, tombol otomatis aktif sesuai data terdaftar, namun peserta/penguji tetap bebas mengubahnya secara langsung melalui tombol.
- **Lencana & Pengubah di Ruang Tunggu (Waiting Room)**:
  - Tampilkan lencana ganda yang mencolok: **Jenjang [SMP / SMA]** dan **Babak [Penyisihan / Semifinal]**.
  - Sediakan tombol *"Ubah Jenjang & Babak"* jika peserta salah memilih paket soal sebelum akses soal dibuka oleh pengawas.
  - Saat ujian dimulai, `participant.category` dan `participant.stage` disalurkan ke `ExamRoom` sehingga paket soal yang dimuat 100% tepat sasaran.

---

## 2. Dasbor Pengawas Panitia (`src/components/ProctorDashboard.tsx`)
- **Tab Bank Soal (Question Bank)**:
  - Hadirkan bilah tombol filter ganda yang terpisah dan terorganisir rapi:
    - Filter Jenjang: `Semua Jenjang`, `SMP`, `SMA` (lengkap dengan jumlah butir soal)
    - Filter Babak: `Semua Babak`, `Penyisihan`, `Semifinal`, `Final` (lengkap dengan jumlah butir soal)
  - Formulir tambah butir soal baru dilengkapi tombol seleksi cepat untuk Jenjang dan Babak.
- **Tab Monitoring Peserta Langsung (Live Monitoring)**:
  - Tambahkan tombol filter Jenjang (`Semua`, `SMP`, `SMA`) dan Babak (`Semua`, `Penyisihan`, `Semifinal`).
  - Tampilkan lencana babak di kartu peserta dan tabel monitoring.
- **Tab Rekap Nilai & Peringkat (Results Recap)**:
  - Tambahkan tombol filter Jenjang dan Babak agar panitia dapat mengekspor dan melihat peringkat per babak (Penyisihan vs Semifinal).
- **Tab Data Pendaftaran Peserta (Registration Sheets)**:
  - Tambahkan filter Jenjang dan Babak untuk melihat distribusi pendaftar.

---

## 3. Integrasi & Aliran Data (`src/App.tsx` & `src/types/index.ts`)
- Memastikan `App.tsx` memfilter `allQuestions` berdasarkan `participant.category` dan `participant.stage` yang dipilih secara presisi.
- Uji coba mandiri 3 soal (Trial Exam) di ruang tunggu juga otomatis menyajikan 3 soal yang relevan dengan jenjang dan babak yang sedang dipilih.

---

## 4. Verifikasi & Pengujian
- Verifikasi kompilasi TypeScript (`tsc --noEmit` & `compile_applet`) untuk memastikan tidak ada breaking changes atau regresi.
- Validasi fungsionalitas pergantian tombol SMP <-> SMA dan Penyisihan <-> Semifinal pada tampilan mobile (HP) dan desktop (laptop).
