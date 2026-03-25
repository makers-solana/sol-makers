import { Command } from "commander";
import * as dotenv from "dotenv";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { keypairIdentity, generateSigner, percentAmount } from "@metaplex-foundation/umi";
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys";
import { mplTokenMetadata, createNft } from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";
import * as fs from "fs";
import * as web3 from "@solana/web3.js";
import bs58 from "bs58";
import path from "path";

dotenv.config();

const program = new Command();

program
  .name("nft-cli")
  .description("CLI to deploy Solana NFTs on Devnet")
  .version("1.0.0");

program
  .command("deploy")
  .description("Deploy a new NFT to Solana Devnet")
  .requiredOption("-n, --name <string>", "Name of the NFT")
  .requiredOption("-s, --symbol <string>", "Symbol of the NFT")
  .requiredOption("-d, --description <string>", "Description of the NFT")
  .requiredOption("-i, --image <path>", "Path to the artwork image file")
  .option("-k, --keypair <path>", "Path to wallet secret key JSON file (or use PRIVATE_KEY in .env)")
  .action(async (options) => {
    try {
      console.log("Starting NFT deployment...");

      // Validate image exists
      const imagePath = path.resolve(process.cwd(), options.image);
      if (!fs.existsSync(imagePath)) {
        console.error(`Error: Image file not found at ${imagePath}`);
        process.exit(1);
      }

      // Initialize UMI for Devnet
      const umi = createUmi("https://api.devnet.solana.com")
        .use(mplTokenMetadata())
        .use(mplToolbox())
        .use(irysUploader({
          address: "https://devnet.irys.xyz"
        }));

      // Load Wallet
      let secretKey: Uint8Array;
      if (options.keypair) {
        const keyfilePath = path.resolve(process.cwd(), options.keypair);
        if (!fs.existsSync(keyfilePath)) {
          console.error(`Error: Keypair file not found at ${keyfilePath}`);
          process.exit(1);
        }
        const keyfileStr = fs.readFileSync(keyfilePath, "utf-8");
        const keyfileJson = JSON.parse(keyfileStr);
        secretKey = Uint8Array.from(keyfileJson);
      } else if (process.env.PRIVATE_KEY) {
        if (process.env.PRIVATE_KEY.startsWith("[")) {
          secretKey = Uint8Array.from(JSON.parse(process.env.PRIVATE_KEY));
        } else {
          secretKey = bs58.decode(process.env.PRIVATE_KEY);
        }
      } else {
        console.error("Error: Must provide --keypair or set PRIVATE_KEY in .env");
        process.exit(1);
      }

      // Set Identity
      const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
      umi.use(keypairIdentity(keypair));
      
      console.log(`Using wallet address: ${keypair.publicKey}`);

      // Check balance
      const connection = new web3.Connection(web3.clusterApiUrl("devnet"));
      const balance = await connection.getBalance(new web3.PublicKey(keypair.publicKey));
      console.log(`Wallet Balance: ${balance / web3.LAMPORTS_PER_SOL} SOL`);

      if (balance === 0) {
        console.warn("Warning: Wallet balance is 0. You may need to request Devnet SOL from https://faucet.solana.com/");
      }

      // Upload Image
      console.log("Uploading image to Arweave via Irys...");
      const imageBuffer = fs.readFileSync(imagePath);
      const imageGenericFile = {
        buffer: imageBuffer,
        fileName: path.basename(imagePath),
        displayName: path.basename(imagePath),
        uniqueName: path.basename(imagePath),
        contentType: getContentType(imagePath),
        extension: path.extname(imagePath).replace(".", ""),
        tags: []
      };

      // Ensure buffer handles for metaplex
      const [imageUri] = await umi.uploader.upload([imageGenericFile]);
      console.log(`Image uploaded: ${imageUri}`);

      // Upload Metadata
      console.log("Uploading metadata...");
      const metadata = {
        name: options.name,
        symbol: options.symbol,
        description: options.description,
        image: imageUri,
        properties: {
          files: [
            {
              type: getContentType(imagePath),
              uri: imageUri,
            },
          ],
        },
      };

      const metadataUri = await umi.uploader.uploadJson(metadata);
      console.log(`Metadata uploaded: ${metadataUri}`);

      // Mint NFT
      console.log("Minting NFT...");
      const mint = generateSigner(umi);
      const tx = await createNft(umi, {
        mint,
        name: options.name,
        symbol: options.symbol,
        uri: metadataUri,
        sellerFeeBasisPoints: percentAmount(0),
        isCollection: false,
      }).sendAndConfirm(umi);

      console.log("\n✅ NFT deployed successfully!");
      console.log(`Mint Address  : ${mint.publicKey}`);
      console.log(`Explorer Link : https://explorer.solana.com/address/${mint.publicKey}?cluster=devnet`);

    } catch (error) {
      console.error("\n❌ Error during deployment:", error);
      process.exit(1);
    }
  });

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

program.parse(process.argv);
