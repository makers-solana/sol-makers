# Solana RWA Platform - thehistorymaker.io

Modern Real World Asset (RWA) Tokenization Platform on Solana Blockchain.

## 📄 Deskripsi Aplikasi
**Solana RWA (The History Maker)** adalah platform investasi properti berbasis blockchain yang memungkinkan fraksionalisasi aset dunia nyata (Real World Assets), khususnya properti villa mewah di lokasi premium seperti Bali. 

Platform ini menjembatani aset fisik dengan likuiditas digital, memungkinkan investor untuk memiliki bagian dari properti melalui kepemilikan token SFT (Semi-Fungible Token) atau NFT. Dengan modal yang lebih terjangkau, siapa pun kini dapat menjadi pemilik aset properti dan mendapatkan keuntungan dari hasil operasional serta kenaikan nilai aset di masa depan.

### Key Features:
- **Fractional Ownership**: Investasi properti mulai dari jumlah kecil melalui tokenisasi.
- **Atomic Swap Transactions**: Pembelian aset yang aman dan instan (SOL ke NFT) dalam satu transaksi.
- **Referral System**: Program loyalitas dengan bagi hasil komisi otomatis (10%) langsung ke dompet pengundang.
- **Real-time Valuation**: Integrasi harga SOL terkini dan pelacakan pasokan token secara on-chain.
- **Wallet Integration**: Dukungan penuh untuk Phantom, Solflare, dan dompet Solana lainnya dengan proteksi keamanan tingkat lanjut.

---

## 🛠️ Deskripsi Teknis

Aplikasi ini dibangun menggunakan arsitektur modern yang memisahkan antara *core logic* blockchain, manajemen data backend, dan antarmuka pengguna yang responsif.

### 1. Tech Stack
- **Frontend**: React.js, Vite, Tailwind CSS (Design System kustom).
- **Backend (API)**: Next.js 14 (App Router).
- **Database**: PostgreSQL dengan Prisma ORM.
- **Blockchain Integration**: Solana Web3.js, SPL Token SDK.
- **Infrastructure**: Docker (Database), Nginx (Reverse Proxy), PM2 (Process Manager).
- **External API**: FreeCryptoAPI (Price Feed).

### 2. Arsitektur Transaksi: Smart Transaction Builder (PST)
Salah satu fitur teknis paling krusial adalah implementasi **Partially Signed Transaction (PST)**. 
- **Masalah**: Dompet seperti Phantom sering memblokir transfer SOL langsung sebagai potensi "Drainer" jika tidak ada pertukaran aset yang jelas.
- **Solusi**: Backend membangun transaksi atomik yang menggabungkan:
    1. Pengiriman SOL dari Pembeli ke Treasury.
    2. Pengiriman SOL komisi dari Pembeli ke Referral.
    3. Pengiriman NFT/SFT dari Treasury ke Pembeli.
- **Proses**: Backend memberikan tanda tangan parsial (*partial sign*) menggunakan kunci Treasury, sehingga transaksi dikenali oleh wallet sebagai "Exchange" yang aman dan sah bagi pengguna.

### 3. Keamanan & Performa
- **CORS Management**: Konfigurasi header keamanan ketat antara domain utama dan API subdomain (`api.thehistorymaker.io`).
- **Middleware Guard**: Proteksi jaringan untuk mencegah transaksi lintas jaringan (mendeteksi Devnet vs Mainnet).
- **Reverse Proxy**: Nginx digunakan untuk menangani enkripsi SSL (Certbot) dan enkapsulasi akses port internal (3000/3001).

### 4. Skema Database
Prisma digunakan untuk mengelola data villa, log pemeliharaan, serta histori harga pasar. Skema atomik memastikan konsistensi antara data off-chain dan status token on-chain.

---

## 🚀 Panduan Instalasi (Development)

### Prasyarat:
- Node.js v18+
- Docker & Docker Compose

### Langkah-langkah:
1. **Clone Repository**:
   ```bash
   git clone https://github.com/username/sol-makers.git
   cd sol-makers
   ```

2. **Setup Environment**:
   Buat file `.env` di folder root, `apps/backend/`, dan `apps/frontend/` sesuai dengan contoh `.env.example`.

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Run Infrastructure (Database)**:
   ```bash
   docker-compose up -d
   ```

5. **Run Backend & Frontend**:
   ```bash
   # Terminal 1 (Backend)
   cd apps/backend
   npx prisma db push
   npm run build
   npm start

   # Terminal 2 (Frontend)
   cd apps/frontend
   npm run dev
   ```

## 🌐 Deployment
Aplikasi ini sudah dikonfigurasi untuk berjalan di VPS Linux menggunakan PM2:
- **API**: Running on port 3001 via Next.js.
- **Frontend**: Serves static artifacts on port 3000.
- **Reverse Proxy**: Nginx mengarahkan traffic HTTPS ke port-port tersebut secara internal.
