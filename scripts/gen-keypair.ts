import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const kp = Keypair.generate();
console.log('public:', kp.publicKey.toBase58());
console.log('secret(base58):', bs58.encode(kp.secretKey));
console.log('secret(json):', JSON.stringify(Array.from(kp.secretKey)));
