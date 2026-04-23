const { Connection, PublicKey, Transaction, Keypair } = require('@solana/web3.js');
const bs58 = require('/root/sol-makers/apps/backend/node_modules/bs58');
const https = require('https');

const BUYER_PRIVATE_KEY = '2GFyGEZzVUtyrBa6npPFSaUU8AvEK9oCGiv6QrovpWVtc1Q99psia8BCSTVU5eBstngF8nYkahQxWsMRpiLitpNH';
const MINT_ADDRESS = '43riPPJd8QwqRjbhJZKewMjbc4iKhnTGJR9Magk1BqKG';
const AMOUNT_TOKENS = 1;
const TOTAL_LAMPORTS = Math.floor(AMOUNT_TOKENS * 0.02 * 1e9);

async function run() {
  const buyerKeypair = Keypair.fromSecretKey(bs58.decode(BUYER_PRIVATE_KEY));
  const buyerAddress = buyerKeypair.publicKey.toString();
  console.log('Buyer:', buyerAddress);
  console.log('Total:', TOTAL_LAMPORTS / 1e9, 'SOL');

  // Call build-tx API
  console.log('\n[1] Calling build-tx...');
  const payload = JSON.stringify({
    buyerAddress,
    mintAddress: MINT_ADDRESS,
    amountTokens: AMOUNT_TOKENS,
    totalLamports: TOTAL_LAMPORTS,
    referralAddress: null,
    referralLamports: 0,
    network: 'mainnet'
  });

  const txBase64 = await new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.thehistorymaker.io',
      path: '/api/solana/build-tx',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload), 'Origin': 'https://thehistorymaker.io' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        console.log('API status:', res.statusCode);
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(json.error));
          resolve(json.transaction);
        } catch(e) { reject(new Error('Bad response: ' + data.substring(0,200))); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  console.log('Got transaction, base64 length:', txBase64.length);

  // Deserialize, re-sign, send
  console.log('\n[2] Signing as buyer...');
  const conn = new Connection('https://solana-rpc.publicnode.com', 'confirmed');
  const tx = Transaction.from(Buffer.from(txBase64, 'base64'));
  
  const { blockhash } = await conn.getLatestBlockhash('finalized');
  tx.recentBlockhash = blockhash;
  tx.feePayer = buyerKeypair.publicKey;
  tx.partialSign(buyerKeypair);
  console.log('Signed OK');

  console.log('\n[3] Sending to mainnet...');
  const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
  console.log('Signature:', sig);
  console.log('Explorer: https://explorer.solana.com/tx/' + sig);

  console.log('\nWaiting for confirmation...');
  await conn.confirmTransaction(sig, 'confirmed');
  console.log('CONFIRMED!');

  const vaultBal = await conn.getBalance(new PublicKey('3qvjpDu3wkvR11aAQAUTB3zxeyTyTUUDAT6wJXAK92hL'));
  console.log('Vault balance now:', vaultBal / 1e9, 'SOL');
}

run().catch(e => console.error('ERROR:', e.message));
