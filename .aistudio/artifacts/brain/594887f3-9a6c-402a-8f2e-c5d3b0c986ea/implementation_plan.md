# Rencana Implementasi: Perbaikan Duplikasi Teks Equation & Formulir Edit Cepat Butir Soal

## 1. Analisis Kebutuhan & Akar Masalah (Root Cause)

### A. Masalah Duplikasi Teks Setelah Equation
Berdasarkan investigasi pada naskah Word (.docx) dan hasil ekstraksi:
1. **Akar Masalah di OpenXML Word**:
   - Ketika dokumen Microsoft Word memuat persamaan matematika (baik OMML `<m:oMath>` maupun Equation Field), Word menyisipkan objek persamaan matematika dan sekaligus menyisipkan *fallback plain text run* (`<w:r><w:t>`) atau teks bayangan (*shadow text*) tepat di sampingnya untuk kompatibilitas pencarian dokumen.
   - Contoh nyata:
     - Huruf variabel `x` pada soal dan opsi diekstrak ganda: token formula `$x$` diekstrak oleh parser, diikuti langsung oleh token teks biasa `x`, menghasilkan tampilan `$x$ x` yang di layar tampak sebagai `xx` (`xx kelipatan 5`).
     - Angka pilihan `1`, `2`, `4`, `5`, `8` diekstrak ganda menjadi `11`, `22`, `44`, `55`, `88`.
     - Rumus pada kotak formula atau pembahasan diekstrak dua kali secara berurutan.
2. **Solusi Algoritmik**:
   - **Pembersihan di Tahap Ekstraksi XML (`server.ts`)**:
     - Deteksi elemen formula matematika dan *look-ahead* ke run teks berikutnya (`<w:t>`). Jika teks pada run berikutnya merupakan duplikat verbatim dari formula atau bagian depan formula matematika yang baru diekstrak, pangkas teks duplikat tersebut.
     - Hapus elemen XML fallback lain yang belum ter-filter (seperti tag bayangan, legacy equation container).
   - **Pembersihan Universal Pasca-Ekstraksi (Post-processing Scrubber)**:
     - Terapkan fungsi pembersih teks otomatis (`scrubEquationShadowDuplicates`) pada seluruh teks soal, opsi jawaban (A–E), dan pembahasan:
       - Menghapus pola `$X$ X` atau `$X$X` menjadi `$X$`.
       - Menghapus pengulangan string persamaan beruntun pada blok formula/teks.
       - Menghapus duplikasi huruf/angka di awal opsi ganda (misal `xx ` menjadi `x `, `11` menjadi `1` jika opsi tunggal).

---

### B. Formulir Edit Cepat Butir Soal di Dashboard Panitia (Solusi Pendamping)
Sebagai solusi alternatif andal yang diminta pengguna agar panitia tidak bergantung penuh pada impor Word dan dapat langsung memperbaiki butir soal kapan saja:
1. **Tombol "Edit Cepat" di Setiap Butir Soal Bank Soal**:
   - Pada kartu soal di daftar bank soal panitia (`ProctorDashboard.tsx`), sediakan tombol **"Edit Cepat"** di samping tombol hapus.
   - Membuka modal dialog komprehensif untuk menyunting teks soal, opsi A–E, kunci jawaban, domain/bidang materi, jenjang, bobot nilai, serta pembahasan secara langsung.
2. **Tombol "Tambah Soal Cepat"**:
   - Memungkinkan panitia membuat butir soal baru dengan formulir modal cepat tanpa harus berpindah halaman atau mengisi form panjang.
3. **Pratinjau KaTeX Real-time (Live Preview)**:
   - Panel pratinjau interaktif di dalam modal yang langsung merender teks dan formula matematika KaTeX ($...$ atau $$...$$) secara instan saat panitia mengetik.
4. **Tombol "Bersihkan Teks Ganda Otomatis"**:
   - Tambahkan tombol utilitas satu-klik di bilah bank soal panitia untuk memindai dan membersihkan seluruh butir soal yang ada di bank soal dari karakter duplikat post-equation.

---

## 2. Rencana Perubahan Berkas & Arsitektur

### 1. `server.ts`
- **Penyempurnaan `extractTextAndMathFromWordXml`**:
  - Tingkatkan penyaringan XML OpenXML agar mengecualikan shadow run teks yang mengikuti `<m:oMath>`.
  - Terapkan `scrubEquationShadowDuplicates` pada teks hasil ekstraksi sebelum diteruskan ke parser deterministik maupun fallback.
- **Implementasi Fungsi Pembersih Universal**:
  ```ts
  function scrubEquationShadowDuplicates(text: string): string
  ```
  - Menghapus duplikasi teks setelah formula inline (contoh: `$x$\s*x` -> `$x$`, `$1$\s*1` -> `$1$`).
  - Menghapus duplikasi teks blok formula yang berulang persis dua kali.
- **Endpoint Update Soal Tunggal**:
  - Pastikan endpoint `PUT /api/questions/:id` tersedia dan berfungsi untuk memperbarui satu butir soal secara spesifik.

### 2. `src/services/api.ts`
- Tambahkan metode `ApiService.updateQuestion(id: string, updatedData: Partial<Question>)` untuk sinkronisasi pembaruan butir soal ke backend server.

### 3. `src/components/QuickQuestionModal.tsx` (Komponen Baru)
- Modal dialog interaktif untuk Tambah / Edit Butir Soal secara cepat:
  - Input Teks Soal (multi-line) dengan bantuan tombol sisip simbol KaTeX cepat ($\frac{a}{b}$, $\sqrt{x}$, $x^2$, $\times$, $\div$).
  - Input Opsi A s.d. E yang terstruktur rapi.
  - Pemilihan Kunci Jawaban (A, B, C, D, E) dan domain matematika.
  - Input Pembahasan lengkap.
  - Tab / Split Live KaTeX Preview dengan status validasi formula.
  - Validasi kelengkapan sebelum disimpan.

### 4. `src/components/ProctorDashboard.tsx`
- Integrasikan `QuickQuestionModal`:
  - Pasang aksi klik "Edit Cepat" pada setiap butir soal di tab Bank Soal.
  - Pasang tombol "Tambah Soal Cepat" di bilah atas Bank Soal.
  - Tambahkan tombol utilitas **"Bersihkan Duplikat Simbol"** dengan konfirmasi dan notifikasi jumlah soal yang berhasil diperbaiki.
- Pastikan perubahan langsung ter-update di antarmuka peserta dan bank soal secara reaktif.

### 5. `src/components/WordImporter.tsx`
- Tambahkan langkah pembersihan ganda pada pratinjau hasil ekstraksi Word sebelum panitia menekan tombol "Tambahkan ke Bank Soal".
- Berikan tombol pemicu pembersihan langsung di layar pratinjau Word Importer jika masih terdeteksi pola karakter berulang.

---

## 3. Rencana Pengujian & Verifikasi

1. **Pengujian Ekstraksi Word**:
   - Uji pemrosesan berkas Word naskah soal matematika yang memuat formula inline (seperti `FPB(72, x) = 3`, pilihan jawaban `$x$ kelipatan 5`, angka `1, 2, 4, 5, 8`).
   - Pastikan teks yang dihasilkan tidak lagi memunculkan `xx`, `11`, `22`, atau baris formula ganda.
2. **Pengujian Formulir Edit Cepat di Dashboard Panitia**:
   - Buka tab "Bank Soal" di Dashboard Pengawas.
   - Klik tombol "Edit Cepat" pada soal: ubah teks dan opsi, amati live preview KaTeX, lalu simpan.
   - Verifikasi bahwa perubahan tersimpan dan tampil sempurna baik di daftar soal maupun di sesi ujian peserta.
   - Klik "Tambah Soal Cepat" dan buat butir soal baru dari awal.
3. **Kompilasi & Linting**:
   - Jalankan `compile_applet` untuk memastikan seluruh tipe TypeScript dan modul lulus tanpa error.
