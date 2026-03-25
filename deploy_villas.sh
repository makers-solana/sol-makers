#!/bin/bash
set -e

echo "Deploying Villa 1: Uluwatu"
~/makers/deploy-nft.sh deploy \
  -n "Uluwatu Cliffside Villa" \
  -s "ULWV" \
  -d "Premium fractionalized modern cliffside villa in Uluwatu, Bali. 40,000 shares available." \
  -i "/mnt/c/Users/MODERN 14/.gemini/antigravity/brain/ac4e41a4-0dd2-4ceb-9070-df5c072b2b06/villa_uluwatu_1774384936394.png" \
  -t 40000

echo "Deploying Villa 2: Ubud"
~/makers/deploy-nft.sh deploy \
  -n "Ubud Jungle Retreat" \
  -s "UBJV" \
  -d "Luxury tropical jungle villa in Ubud, surrounded by palm trees. 40,000 shares available." \
  -i "/mnt/c/Users/MODERN 14/.gemini/antigravity/brain/ac4e41a4-0dd2-4ceb-9070-df5c072b2b06/villa_ubud_1774384976227.png" \
  -t 40000

echo "Deploying Villa 3: Seminyak"
~/makers/deploy-nft.sh deploy \
  -n "Seminyak Beachfront Villa" \
  -s "SMBV" \
  -d "Exclusive luxury beachfront villa in Seminyak, perfect for sunset views. 40,000 shares available." \
  -i "/mnt/c/Users/MODERN 14/.gemini/antigravity/brain/ac4e41a4-0dd2-4ceb-9070-df5c072b2b06/villa_seminyak_1774385029337.png" \
  -t 40000

echo "Deploying Villa 4: Canggu"
~/makers/deploy-nft.sh deploy \
  -n "Canggu Eco Villa" \
  -s "CGEV" \
  -d "Minimalist eco-friendly villa with stunning rice terrace views in Canggu. 40,000 shares available." \
  -i "/mnt/c/Users/MODERN 14/.gemini/antigravity/brain/ac4e41a4-0dd2-4ceb-9070-df5c072b2b06/villa_canggu_1774385051669.png" \
  -t 40000

echo "ALL DEPLOYMENTS COMPLETE!"
