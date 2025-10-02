# NdangFit - Aplikasi Monitoring Latihan Gym

Aplikasi **NdangFit** adalah solusi untuk memonitor dan mencatat perjalanan Anda dalam dunia gym. Aplikasi ini dirancang untuk membantu Anda melacak setiap sesi latihan, memantau perkembangan, dan memvisualisasikan data statistik untuk mencapai tujuan kebugaran Anda.

---

## Fitur Utama

- **Pencatatan Latihan**: Catat setiap set, repetisi, dan beban untuk setiap latihan yang Anda lakukan.
- **Progress Tracking**: Pantau perkembangan kekuatan dan daya tahan Anda dari waktu ke waktu.
- **Statistik & Visualisasi**: Lihat grafik dan *chart* yang memvisualisasikan data latihan Anda, membantu Anda memahami pola dan kemajuan yang telah dicapai.
- **Manajemen Tujuan**: Tetapkan target kebugaran dan lacak sejauh mana Anda telah mencapainya.
- **Antarmuka Pengguna Intuitif**: Navigasi yang mudah dengan desain yang bersih untuk pengalaman pengguna yang optimal.

---

## Struktur Proyek

Proyek ini dibagi menjadi dua bagian utama: **Backend** (`be`) dan **Frontend** (`fe`).

- **`be` (Backend)**:
  - Berisi logika server, API, dan koneksi database.
  - Menggunakan Python dengan file `run.py` sebagai titik masuk aplikasi.
  - Dependensi yang diperlukan tercantum dalam `requirements.txt`.

- **`fe` (Frontend)**:
  - Berisi semua file *client-side* seperti HTML, CSS, dan JavaScript.
  - **`css/`**: Berisi file *styling* untuk tampilan aplikasi.
  - **`js/`**: Berisi *script* JavaScript untuk fungsionalitas interaktif.
  - File HTML seperti `dashboard.html`, `login.html`, dan `workout_log.html` menyediakan halaman-halaman utama aplikasi.

---

## Cara Menjalankan Aplikasi

### Persyaratan

Pastikan Anda sudah menginstal **Python** dan **pip** di sistem Anda.

### Langkah-langkah

1.  **Clone repositori ini**:
    ```bash
    git clone https://github.com/K4ZED/NdangFit.git
    cd NdangFit
    ```

2.  **Instal dependensi backend**:
    ```bash
    cd be
    pip install -r requirements.txt
    ```

3.  **Jalankan server backend**:
    ```bash
    python run.py
    ```
    Server akan berjalan di `http://localhost:5000` (atau port lain sesuai konfigurasi).

4.  **Buka aplikasi frontend**:
    Buka file `fe/login.html` di *browser* Anda untuk memulai.

---

## Kontribusi

Kami menyambut setiap kontribusi! Jika Anda ingin berkontribusi pada proyek ini, silakan buat *pull request* atau laporkan *issue* jika menemukan *bug*.
