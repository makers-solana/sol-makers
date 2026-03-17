# Makers Monorepo - Multi-Chain RWA Fractional Ownership

This project is a high-fidelity Asset Management System for luxury villas, enabling users to own fractional shares via NFTs on both **Ethereum (Sepolia)** and **Solana (Devnet)**, with dynamic yields and a professional ERP dashboard.

## Getting Started

### 1. Prerequisites

- **Node.js** (v18 or later)
- **PostgreSQL** (Running instance)
- **WSL2** (Recommended for Windows users)
- **Docker** (For unified stack management)

### 2. Installation

Run the following command from the root directory to install all dependencies:

```bash
npm install
```

### 3. Environment Setup

#### Backend (`apps/backend`)

Create a `.env` file in `apps/backend/` and add your database URL:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/makers_db"
```

#### Frontend (`apps/frontend`)

The frontend uses the Thirdweb client and Solana connection from its internal configuration.

### 4. Database Setup & Seeding

Initialize the database and seed the two main assets (Sepolia & Solana):

```bash
cd apps/backend
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 5. Running the Application

To start both the Frontend and Backend simultaneously from the root:

```bash
npm run dev
```

- **Frontend (Investor Dashboard)**: [http://localhost:3000](http://localhost:3000)
- **Backend (ERP Admin Dashboard)**: [http://localhost:3001](http://localhost:3001)

---

## Project Architecture

### Backend (`apps/backend`)

- **Framework**: Next.js 14 (App Router)
- **Admin UI**: A dark theme for asset control.
- **ORM**: Prisma with PostgreSQL.
- **Features**: Real-time supply tracking (`totalSupply` integration), multi-chain administrative connections, and asset filtering.

### Frontend (`apps/frontend`)

- **Framework**: Vite + React
- **Web3 Tools**: Thirdweb SDK (EVM) and Solana Wallet Adapter.
- **Features**: Fractional property investment, immersive 3D-inspired glassmorphism design, and dual-chain wallet support.

### Primary Assets (Devnet)

The system is currently configured to track and manage the following exclusive assets:

1. **Sepolia (EVM)**: `0x2B91E94Ce68cDf1321269c135Fbb12A2C1F781E5` (Makers Villa Bali)
2. **Solana (Devnet)**: `BxUy8Xyj4ZXJsc6m6HdqPNQT9UY35dbUM4bLMVHCBZoS` (Solana Sunset Villa)

---

## 🛠️ Key Professional Features

- **Strict Asset Registry**: Both dashboards are filtered to display ONLY verified RWA assets.
- **Multi-Chain Connectivity**: Connect via MetaMask/Thirdweb for Sepolia and Phantom/Solflare for Solana.
- **Dynamic Yield Tracker**: Real-time EAR (Estimated Annual Return) andized yields calculation.
- **Audit-Ready Operations**: Integrated maintenance logs and market price tracking in the backend ERP.
