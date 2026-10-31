# Rencana Implementasi: Palet Warna Konsisten (Iron Gate & Sky Blue) & Revisi 3 Pilar Nalar Matematika

## 1. Analisis Kebutuhan & Penyesuaian

### A. Palet Warna Konsisten & Animasi Interaktif
- **Fondasi Utama (Iron Gate - `#53585E`):** Digunakan untuk header, kontainer struktural, tipografi utama, tombol sekunder, dan garis batas solid yang kokoh.
- **Aksen Cerah (Sky Blue - `#83B9DF`):** Digunakan untuk badge aktif, sorotan pilar, fokus input, gradasi aksen, dan efek kilau (*soft glow*).
- **Efek Interaktivitas Hover:**
  - *Smooth elevation* (`hover:-translate-y-0.5` dan `transition-all duration-300 ease-out`).
  - *Soft Sky Blue Glow* (`hover:shadow-[0_8px_25px_rgba(131,185,223,0.35)]`).
  - Efek transisi warna halus pada border dan latar belakang tanpa menyebabkan loncatan posisi (*layout shift*) atau error JavaScript.

### B. Revisi Panduan & Alur Perkembangan Peserta (Explore, Think, Excel)
- **Permintaan Pengguna:** Menghapus pengotakan kaku babak (misal: "Penyisihan hanya Explore").
- **Koreksi:** Menjelaskan bahwa **seluruh babak kompetisi (termasuk Babak Penyisihan)** mengintegrasikan ketiga pilar nalar matematika secara simultan:
  1. **EXPLORE (Eksplorasi):** Menemukan pola bilangan, membedah struktur geometri/tabel, dan mengekstraksi informasi awal.
  2. **THINK (Penalaran Kritis):** Membangun argumen deduktif, menguji kondisi majemuk, dan mengeliminasi pilihan salah.
  3. **EXCEL (Keunggulan & Ketepatan):** Eksekusi komputasi presisi tinggi, efisiensi langkah, dan perumusan solusi optimal.

---

## 2. Rincian Modifikasi Berkas

### 1. `src/components/GuidelinesView.tsx`
- Memperbarui section "Alur Perkembangan Peserta" menjadi **"3 Pilar Nalar Matematika MMO 2027: Terintegrasi di Seluruh Babak"**.
- Memberikan penjelasan komprehensif bahwa butir soal Babak Penyisihan, Semifinal, hingga Final secara langsung menguji perpaduan *Explore*, *Think*, dan *Excel*.
- Memperbarui kartu pilar dengan palet Iron Gate (`#53585E`) dan Sky Blue (`#83B9DF`), lengkap dengan efek hover glow dan elevasi kartu.

### 2. `src/components/LandingPortal.tsx`
- Memperbarui kartu tema dan pilar di Tahap 1 & Tahap 2:
  - Mengganti teks lama menjadi 3 Pilar Nalar Terpadu di seluruh babak.
  - Menerapkan tombol aksi dan kontainer dengan warna Iron Gate `#53585E` dan aksen Sky Blue `#83B9DF`.
- Menambahkan kelas mikro-interaksi CSS Tailwind pada:
  - Tombol Stepper (1, 2, 3)
  - Kartu Hero & Kartu 3 Pilar
  - Tombol aksi ("Lanjut ke Pedoman", "Masuk ke Ruang Ujian", "Mulai Uji Coba (3 Soal)")
  - Kartu Ruang Tunggu & Form Kode Akses Darurat Panitia.

### 3. `src/components/TopNavbar.tsx` & Elemen Navigasi
- Menyelaraskan aksen navbar atas dengan perpaduan Iron Gate `#53585E` dan border/badge Sky Blue `#83B9DF`.
- Menambahkan efek hover glow lembut pada logo dan indikator status.

### 4. `src/components/TrialExamModal.tsx` & `QuestionCard.tsx`
- Menyelaraskan opsi jawaban dan kontrol navigasi soal agar memiliki sorotan Sky Blue `#83B9DF` saat dipilih dan saat kursor diarahkan (*hover*), dengan teks fondasi Iron Gate `#53585E`.

---

## 3. Langkah-Langkah Verifikasi
1. **Verifikasi Tampilan & Interaksi:**
   - Memastikan efek hover pada seluruh kartu dan tombol berjalan mulus (60 FPS) tanpa menyebabkan kedutan (*jitter*) atau pergeseran posisi.
   - Memastikan palet Iron Gate (`#53585E`) dan Sky Blue (`#83B9DF`) tampil kontras, estetis, dan nyaman dibaca di layar HP maupun laptop.
2. **Verifikasi Konten Pedoman:**
   - Memastikan tidak ada lagi tulisan "Babak Penyisihan hanya Explore".
   - Memastikan narasi 3 Pilar Nalar Matematika terpadu di setiap babak terbaca dengan jelas.
3. **Pengujian Build & Lint:**
   - Menjalankan `npm run lint` (`tsc --noEmit`) untuk memastikan nol kesalahan tipe TypeScript.
   - Menjalankan `compile_applet` untuk memastikan build produksi Vite berhasil 100%.
