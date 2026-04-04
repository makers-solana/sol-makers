#!/bin/bash
set -e

# Support passing network as first argument, default to devnet
NETWORK=${1:-devnet}

echo "Deploying to Solana Network: $NETWORK"

echo "Deploying Villa 1: Uluwatu"
~/makers/deploy-nft.sh deploy \
  --network "$NETWORK" \
  -n "Villa Dreamland 1" \
  -s "ULWV" \
  -d "Premium fractionalized modern cliffside villa in Uluwatu, Bali. 40,000 shares available." \
  -i "image" \
  -t 40000

echo "Deploying Villa 2: Ubud"
~/makers/deploy-nft.sh deploy \
  --network "$NETWORK" \
  -n "Villa Dreamland 2" \
  -s "UBJV" \
  -d "Luxury tropical jungle villa in Ubud, surrounded by palm trees. 40,000 shares available." \
  -i "image" \
  -t 40000

echo "Deploying Villa 3: Seminyak"
~/makers/deploy-nft.sh deploy \
  --network "$NETWORK" \
  -n "Villa Dreamland 3" \
  -s "SMBV" \
  -d "Exclusive luxury beachfront villa in Seminyak, perfect for sunset views. 40,000 shares available." \
  -i "image" \
  -t 40000

echo "Deploying Villa 4: Canggu"
~/makers/deploy-nft.sh deploy \
  --network "$NETWORK" \
  -n "Villa Dreamland 4" \
  -s "CGEV" \
  -d "Minimalist eco-friendly villa with stunning rice terrace views in Canggu. 40,000 shares available." \
  -i "image" \
  -t 40000

echo "ALL DEPLOYMENTS COMPLETE ON $NETWORK!"
