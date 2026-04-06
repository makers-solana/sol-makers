import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createV1, mintV1, TokenStandard, mplTokenMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { setComputeUnitPrice } from '@metaplex-foundation/mpl-toolbox';
import { keypairIdentity, generateSigner, percentAmount, createGenericFileFromBrowserFile, createGenericFile } from '@metaplex-foundation/umi';
import { irysUploader } from '@metaplex-foundation/umi-uploader-irys';
import bs58 from 'bs58';

const prisma = new PrismaClient();

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://thehistorymaker.io',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

export const dynamic = 'force-dynamic';

// Wallets authorized to deploy NFTs
// Treasury wallet also receives payments & holds unsold tokens
const ALLOWED_DEPLOYERS = [
  '5xKeGY3yZnMV3cz8MLqc9sjrbjH12yLbynB59aMpSvKz', // Treasury (Mainnet) — receives payments & deploys
  'EUWDRpaq8yc5X7paoA7GMfLieL8qUfB3MTm744v7kTim', // Deployer (Mainnet) — deploy only, not treasury receiver
  '8bw4qgyQnChaa91hxUViB8gMLjmC39UvFsPMydwRmUN8', // Devnet
];

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    const callerAddress = formData.get('callerAddress') as string;
    const network = formData.get('network') as string;
    const name = formData.get('name') as string;
    const symbol = formData.get('symbol') as string;
    const description = formData.get('description') as string;
    const supplyStr = formData.get('supply') as string;
    const attributesStr = formData.get('attributes') as string;
    const file = formData.get('file') as File;
    
    // Additional ERP/Marketplace fields that we should pass from frontend
    // but for now let's use defaults or try to get from formData
    const pricePerShare = parseFloat(formData.get('pricePerShare') as string) || 100;
    const totalValue = parseFloat(formData.get('totalValue') as string) || (pricePerShare * (parseInt(supplyStr) || 40000));

    const supply = parseInt(supplyStr) || 40000;
    const attributesRaw = attributesStr ? JSON.parse(attributesStr) : [];

    // Gate: only authorized deployer wallet can deploy
    if (!callerAddress || !ALLOWED_DEPLOYERS.includes(callerAddress)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only the Authorized Deployer wallet can deploy NFTs.' },
        { status: 403, headers: corsHeaders }
      );
    }

    if (!name || !symbol || !network) {
      return NextResponse.json(
        { error: 'Missing required fields: name, symbol, network' },
        { status: 400, headers: corsHeaders }
      );
    }

    const isMainnet = network === 'mainnet';
    const rpcUrl = isMainnet
      ? 'https://api.mainnet-beta.solana.com' // Switch to official RPC
      : 'https://rpc.ankr.com/solana_devnet';

    // Load private key
    const privateKeyString = isMainnet
      ? process.env.MAINNET_PRIVATE_KEY
      : process.env.DEVNET_PRIVATE_KEY;

    if (!privateKeyString) {
      return NextResponse.json(
        { error: `${isMainnet ? 'MAINNET' : 'DEVNET'}_PRIVATE_KEY not configured` },
        { status: 500, headers: corsHeaders }
      );
    }

    let secretKey: Uint8Array;
    try {
      if (privateKeyString.startsWith('[')) {
        secretKey = Uint8Array.from(JSON.parse(privateKeyString));
      } else {
        secretKey = bs58.decode(privateKeyString);
      }
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid private key format in server config' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Setup UMI with Irys Uploader
    const irysAddress = isMainnet ? 'https://node1.irys.xyz' : 'https://devnet.irys.xyz';
    const umi = createUmi(rpcUrl, { commitment: 'confirmed' })
      .use(mplTokenMetadata())
      .use(irysUploader({ address: irysAddress }));

    const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
    umi.use(keypairIdentity(keypair));

    const walletAddress = keypair.publicKey.toString();
    console.log(`[Flush NFT] Wallet: ${walletAddress}, Network: ${network}, Irys: ${irysAddress}`);

    // Check balance - Irys needs SOL for funding if the file is large (>100kb usually)
    const balance = await umi.rpc.getBalance(keypair.publicKey);
    const solBalance = Number(balance.basisPoints) / 1e9;
    if (solBalance < 0.05) {
      return NextResponse.json(
        { error: `Insufficient SOL balance: ${solBalance.toFixed(4)} SOL. Need at least 0.05 SOL for Irys storage + Mint fees.` },
        { status: 400, headers: corsHeaders }
      );
    }

    let assetUri = '';
    if (file) {
      let retries = 3;
      while (retries > 0) {
        try {
          console.log(`[Deploy NFT] Uploading asset binary to Irys (Attempt ${4 - retries})...`);
          const buffer = await file.arrayBuffer();
          const genericFile = createGenericFile(
            new Uint8Array(buffer),
            file.name,
            { contentType: file.type }
          );
          const [uri] = await umi.uploader.upload([genericFile]);
          assetUri = uri;
          console.log(`[Deploy NFT] Asset uploaded successfully: ${assetUri}`);
          break;
        } catch (err: any) {
          retries--;
          console.error(`[Deploy NFT] Asset upload failed: ${err.message}. Retries left: ${retries}`);
          if (retries === 0) throw err;
          await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
        }
      }
    }

    // Build metadata URI JSON
    const metadataJson = {
      name,
      symbol,
      description: description || '',
      image: assetUri || '',
      external_url: 'https://thehistorymaker.io',
      attributes: attributesRaw || [],
      properties: {
        files: assetUri ? [{ uri: assetUri, type: file?.type || 'image/png' }] : [],
        category: file?.type?.startsWith('video') ? 'video' : 'image',
      },
    };

    let metadataUri = '';
    let metaRetries = 3;
    while (metaRetries > 0) {
      try {
        console.log(`[Deploy NFT] Uploading Metadata JSON to Irys (Attempt ${4 - metaRetries})...`);
        metadataUri = await umi.uploader.uploadJson(metadataJson);
        console.log(`[Deploy NFT] Metadata uploaded successfully: ${metadataUri}`);
        break;
      } catch (err: any) {
        metaRetries--;
        console.error(`[Deploy NFT] Metadata upload failed: ${err.message}. Retries left: ${metaRetries}`);
        if (metaRetries === 0) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Create SFT
    const mint = generateSigner(umi);
    const tokenSupply = supply || 40000;

    // Use priority fees for Mainnet to avoid "block height exceeded" errors
    // Increased to 1,200,000 for better reliability during congestion
    const microLamports = isMainnet ? 1_200_000 : 10_000;

    console.log(`[Deploy NFT] Creating SFT on Chain: ${name} (${symbol}), supply: ${tokenSupply} with ${microLamports} microLamports priority fee`);

    await createV1(umi, {
      mint,
      authority: umi.identity,
      name,
      symbol,
      uri: metadataUri,
      sellerFeeBasisPoints: percentAmount(0),
      decimals: 0,
      tokenStandard: TokenStandard.FungibleAsset,
    })
    .prepend(setComputeUnitPrice(umi, { microLamports }))
    .sendAndConfirm(umi);

    const mintAddress = mint.publicKey.toString();
    console.log(`[Deploy NFT] Mint created: ${mintAddress}`);

    // Mint supply to deployer
    await mintV1(umi, {
      mint: mint.publicKey,
      authority: umi.identity,
      amount: tokenSupply,
      tokenOwner: umi.identity.publicKey,
      tokenStandard: TokenStandard.FungibleAsset,
    })
    .prepend(setComputeUnitPrice(umi, { microLamports }))
    .sendAndConfirm(umi);

    console.log(`[Deploy NFT] Minted ${tokenSupply} tokens to ${walletAddress}. Syncing with Database...`);

    // --- DATABASE SYNC ---
    try {
      // Find attributes in the array
      const getAttr = (type: string) => {
        const attr = attributesRaw.find((a: any) => a.trait_type?.toLowerCase() === type.toLowerCase());
        return attr ? attr.value : "";
      };

      const location = getAttr('Location') || "Bali, Indonesia";
      const bedrooms = parseInt(getAttr('Bedrooms')) || 0;
      const bathrooms = parseInt(getAttr('Bathrooms')) || 0;
      const sqmStr = getAttr('Land Size') || getAttr('Sqm') || "0";
      const sqm = parseFloat(sqmStr.replace(/[^0-9.]/g, '')) || 0;

      await prisma.villa.create({
        data: {
          name,
          location,
          description: description || `Fractionalized ownership of ${name}.`,
          legalStructure: "FRACTIONAL_OWNERSHIP",
          totalShares: supply,
          availableShares: supply,
          pricePerShare: pricePerShare,
          totalValue: totalValue,
          images: [assetUri], // Primary image is the Arweave asset URI
          nftAddress: mintAddress,
          chain: "solana",
          totalTokens: supply,
          tokensSold: 0,
          bedrooms: bedrooms,
          bathrooms: bathrooms,
          sqm: sqm,
          occupancyStatus: "ACTIVE",
          ery: 12.0, // Default ERY
          ary: 12.0, // Default ARY
        }
      });
      console.log(`[Deploy NFT] Database entry created for ${name}`);
    } catch (dbErr) {
      console.warn(`[Deploy NFT] Warning: Solana Mint Succeeded BUT Database Sync Failed:`, dbErr);
      // We return success anyway because the on-chain mint happened, but we log the error
    }

    return NextResponse.json({
      success: true,
      mintAddress,
      network,
      supply: tokenSupply,
      deployer: walletAddress,
      assetUri,
      metadataUri,
      message: `Successfully deployed ${name} (${symbol}) and listed in marketplace.`,
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('[Deploy NFT] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during deployment' },
      { status: 500, headers: corsHeaders }
    );
  }
}

