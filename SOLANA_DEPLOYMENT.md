# Solana Deployment Guide

This guide explains how to deploy fractionalized villa assets (NFTs/SFTs) to the Solana network using the internal `nft-cli` tool.

## Prerequisites

- Node.js installed
- Solana CLI (optional, for wallet management)
- A funded Solana wallet (Devnet or Mainnet)

## Environment Configuration

Copy the following variables into your `.env` file in the root directory:

```env
# Solana Network Selection
SOLANA_NETWORK=devnet

# Private Keys (Array format [1,2,3...])
DEVNET_PRIVATE_KEY=[your_devnet_private_key]
MAINNET_PRIVATE_KEY=[your_mainnet_private_key]

# Optional: Custom RPC URLs
# DEVNET_RPC_URL=https://api.devnet.solana.com
# MAINNET_RPC_URL=https://api.mainnet-beta.solana.com
```

## Deployment Scripts

### 1. Unified Villa Deployment
Deploy all villa assets at once using the pre-configured script.

**To Devnet:**
```bash
./deploy_villas.sh devnet
```

**To Mainnet:**
```bash
./deploy_villas.sh mainnet
```

### 2. Manual NFT Deployment
If you want to deploy a single custom NFT, use the `deploy-nft.sh` wrapper.

```bash
./deploy-nft.sh deploy \
  --network devnet \
  --name "My NFT Name" \
  --symbol "MNFT" \
  --description "Description of my NFT" \
  --image "./path/to/image.png" \
  --total 1
```

**Options:**
- `--network`: `devnet` or `mainnet` (default: `devnet`)
- `--name`, `-n`: Name of the asset.
- `--symbol`, `-s`: Symbol of the asset.
- `--description`, `-d`: Detailed description.
- `--image`, `-i`: Path to the image file.
- `--total`, `-t`: Total supply. If > 1, it will create a SFT (Semi-Fungible Token).

## Troubleshooting

### Zero Balance
If the deployment fails with a balance error:
- **Devnet**: Get SOL from [faucet.solana.com](https://faucet.solana.com/).
- **Mainnet**: Ensure your wallet has enough SOL to cover minting and metadata storage costs (~0.02 SOL per unique asset).

### Arweave/Irys Upload
The CLI uses **Irys** to upload metadata to Arweave. 
- Devnet uploads are free on the Irys Devnet node.
- Mainnet uploads require a small amount of SOL in your wallet to cover data storage.
