import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createV1, mintV1, TokenStandard, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { keypairIdentity, generateSigner, percentAmount } from '@metaplex-foundation/umi';
import { base58 } from '@metaplex-foundation/umi/serializers';
import * as fs from 'fs';
import bs58 from 'bs58';

async function main() {
  console.log("Starting Solana Mainnet Deployment...");

  // Parse .env manually
  const envFile = fs.readFileSync('.env', 'utf8');
  let mainnetKeyStr = '';
  envFile.split('\n').forEach(line => {
    if (line.startsWith('MAINNET_PRIVATE_KEY=')) {
      mainnetKeyStr = line.split('=')[1].trim();
    }
  });

  if (!mainnetKeyStr) {
    throw new Error('MAINNET_PRIVATE_KEY not found in .env');
  }

  // Setup Umi
  const umi = createUmi('https://api.mainnet-beta.solana.com', { commitment: 'confirmed' }).use(mplTokenMetadata());
  
  // The user's key relies on bs58 format
  let secretKey;
  try {
    secretKey = bs58.decode(mainnetKeyStr);
  } catch (e) {
    if (mainnetKeyStr.startsWith('[')) {
      secretKey = Uint8Array.from(JSON.parse(mainnetKeyStr));
    } else {
      throw new Error("Invalid Private Key format");
    }
  }

  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  umi.use(keypairIdentity(keypair));

  console.log('Deploying with wallet:', keypair.publicKey.toString());
  const SOL_BALANCE = await umi.rpc.getBalance(keypair.publicKey);
  console.log(`Current Balance: ${Number(SOL_BALANCE.basisPoints) / 1e9} SOL`);

  if (Number(SOL_BALANCE.basisPoints) < 0.05 * 1e9) {
    throw new Error("Insufficient SOL balance to deploy 4 NFTs (~0.05 SOL required)");
  }

  // 4 Villas
  const villas = [
    { name: 'Villa Dreamland 1', symbol: 'ULWV', supply: 40000 },
    { name: 'Villa Dreamland 2', symbol: 'UBJV', supply: 40000 },
    { name: 'Villa Dreamland 3', symbol: 'SMBV', supply: 40000 },
    { name: 'Villa Dreamland 4', symbol: 'CGEV', supply: 40000 }
  ];

  const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

  for (let i = 2; i < villas.length; i++) {
    await delay(3000); // 3 sec delay to avoid 429 Too Many Requests
    const villa = villas[i];
    console.log(`\n--- Deploying ${villa.name} ---`);
    const mint = generateSigner(umi);

    // Creates the fungible asset (SFT)
    try {
      await createV1(umi, {
        mint,
        authority: umi.identity,
        name: villa.name,
        symbol: villa.symbol,
        uri: `https://api.thehistorymaker.io/metadata/villa${i+1}.json`, // Dummy URI
        sellerFeeBasisPoints: percentAmount(0),
        decimals: 0,
        tokenStandard: TokenStandard.FungibleAsset,
      }).sendAndConfirm(umi);

      console.log(`Created Mint Account: ${mint.publicKey.toString()}`);

      // Mint the supply to the deployer
      await mintV1(umi, {
        mint: mint.publicKey,
        authority: umi.identity,
        amount: villa.supply,
        tokenOwner: umi.identity.publicKey,
        tokenStandard: TokenStandard.FungibleAsset,
      }).sendAndConfirm(umi);

      console.log(`>> Successfully minted ${villa.supply} tokens for ${villa.name} to ${mint.publicKey.toString()}`);
    } catch (error) {
      console.error(`Failed to deploy ${villa.name}:`, error);
    }
  }

  console.log("\nALL DEPLOYMENTS FINISHED.");
}

main().catch(console.error);
