# Hirevelo — Dua Arah

Logo final yang dipilih pemilik proyek: konsep B. Dua bentuk setara mendekat satu sama lain, mewakili pertemuan kandidat dan recruiter. Logo aplikasi menggunakan `hirevelo-horizontal.svg`; tab browser menggunakan simbol putih pada tile forest.

## File utama

| File                         | Pemakaian                                                     |
| ---------------------------- | ------------------------------------------------------------- |
| `hirevelo-horizontal.svg`    | Header, login, sidebar, dan footer pada latar terang          |
| `hirevelo-symbol.svg`        | Simbol pada latar terang                                      |
| `hirevelo-browser-icon.svg`  | Favicon putih pada tile forest, terbaca pada tab terang/gelap |
| `hirevelo-share-preview.svg` | Master gambar pratinjau tautan web                            |

SVG final memakai path, tanpa font, stroke, filter, raster, maupun ketergantungan eksternal. File aplikasi `src/app/icon.svg`, `favicon.ico`, `apple-icon.png`, dan `opengraph-image.png` adalah salinan/hasil render aset utama; Next.js menambahkan metadata secara otomatis. Ekspor duplikat, varian yang tidak digunakan, serta gambar presentasi telah dibersihkan. Simpan hasil ekspor tambahan di luar repositori atau di direktori `variants/` yang diabaikan Git.

## Ruang dan ukuran

Sisakan ruang kosong minimal setengah ketebalan pita simbol (24 unit pada grid 256) di sekeliling bentuk. Padding SVG horizontal sudah memuat ruang tersebut; jangan memotong viewBox. Minimum horizontal 144 px lebar; simbol 16 px untuk favicon dan 24 px untuk UI biasa. Minimum cetak awal: horizontal 30 mm dan simbol 6 mm; periksa proof sesuai bahan cetak.

## Warna

| Nama              | HEX     | RGB           | CMYK perkiraan |
| ----------------- | ------- | ------------- | -------------- |
| Forest            | #124C3C | 18, 76, 60    | 76, 0, 21, 70  |
| Mint, latar       | #DCF4E5 | 220, 244, 229 | 10, 0, 6, 4    |
| Putih             | #FFFFFF | 255, 255, 255 | 0, 0, 0, 0     |
| Hitam, satu warna | #000000 | 0, 0, 0       | 0, 0, 0, 100   |

Gunakan forest pada putih/mint, atau putih pada forest/gelap. Kontras forest terhadap putih sekitar 9.88:1. Nilai CMYK adalah konversi matematis awal, bukan profil cetak. Warna spot/Pantone belum ditetapkan; cocokkan dengan sampel fisik bila akan mencetak.

## Tipografi dan pemakaian

Wordmark berbasis Noto Sans Semibold dengan jarak huruf yang disesuaikan, lalu dikonversi menjadi outline. Noto Sans berlisensi SIL Open Font License 1.1; salinannya tersedia di `FONT-LICENSE.txt`. Font antarmuka tetap Geist. Gunakan file wordmark, bukan mengetik ulang nama untuk membentuk logo.

Pertahankan proporsi, orientasi, warna, dan posisi simbol terhadap nama. Hindari efek bayangan, gradient, outline, rotasi, peregangan, atau latar foto yang ramai tanpa bidang penyangga.

## Verifikasi dan regenerasi

Konsep diperiksa pada 16/32/64 px, satu warna, reversed, mirror, rotasi, blur, dan dibandingkan dengan pustaka referensi. Aset final diperiksa kembali melalui audit SVG dan render. Pemeriksaan ini tidak memberikan jaminan merek dagang.

Untuk memperbarui aset browser, render `hirevelo-browser-icon.svg` ke ICO ukuran 16/32/48 dan salin SVG ke `src/app/icon.svg`. Render `hirevelo-share-preview.svg` pada 1200 × 630 ke `src/app/opengraph-image.png`. Pertahankan sumber SVG sebagai master.
