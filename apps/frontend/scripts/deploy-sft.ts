import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { 
  createAndMint, 
  mplTokenMetadata, 
  TokenStandard 
} from '@metaplex-foundation/mpl-token-metadata';
import { 
  createSignerFromKeypair, 
  signerIdentity, 
  percentAmount, 
  generateSigner 
} from '@metaplex-foundation/umi';
import bs58 from 'bs58';

// Initialize Umi with Devnet
const umi = createUmi('https://api.devnet.solana.com');

// Load keypair from the provided private key
const privateKey = '4vbWMELhtXDo9jVF5gGGpM8t4VUsiAJeYyZ3FRrkUt8QyYjVQtz2LEvVvB7tgZVznWE3dkQWV7FQQtqEj6vWir1G';
const keypairBytes = bs58.decode(privateKey);
const keypair = umi.eddsa.createKeypairFromSecretKey(keypairBytes);
const signer = createSignerFromKeypair(umi, keypair);

umi.use(signerIdentity(signer));
umi.use(mplTokenMetadata());

const mint = generateSigner(umi);

async function createSFT() {
  console.log("-----------------------------------------");
  console.log("🚀 Starting Solana Metaplex SFT Deployment");
  console.log("-----------------------------------------");
  console.log("Minting to:", signer.publicKey.toString());
  
  try {
    // Note: In a real production environment, you would upload the metadata to IPFS/Arweave first.
    // For this demonstration, we use a placeholder URI.
    const metadataUri = "https://raw.githubusercontent.com/kotarominami/makers/main/apps/frontend/src/assets/solana-metadata.json";

    await createAndMint(umi, {
      mint,
      name: "Makers Villa Bali",
      symbol: "MVB",
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
      decimals: 0,
      amount: 40000,
      tokenOwner: signer.publicKey,
      tokenStandard: TokenStandard.FungibleAsset, // Semi-Fungible Token
    }).sendAndConfirm(umi);

    console.log("✅ Successfully deployed SFT!");
    console.log("📍 Mint Address:", mint.publicKey.toString());
    console.log("-----------------------------------------");
    console.log("Please update Dashboard.tsx with this address.");
  } catch (error) {
    console.error("❌ Deployment failed:", error);
  }
}

createSFT();
