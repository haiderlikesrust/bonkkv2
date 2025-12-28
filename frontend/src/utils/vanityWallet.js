import { Keypair } from '@solana/web3.js';

/**
 * Vanity Wallet Configuration
 * This is the pre-generated vanity wallet keypair to use for mint addresses
 */
const VANITY_WALLET_SECRET_KEY = new Uint8Array([
  135, 212, 156, 14, 249, 188, 66, 129, 121, 36, 175, 2, 245, 151, 45, 152,
  156, 97, 202, 16, 40, 161, 240, 251, 147, 2, 230, 27, 43, 141, 126, 166,
  8, 238, 117, 81, 29, 61, 80, 130, 130, 132, 90, 22, 164, 22, 95, 67,
  1, 6, 74, 239, 41, 230, 93, 245, 43, 190, 144, 91, 120, 74, 21, 149
]);

/**
 * Get the vanity wallet keypair
 * @returns {Keypair} The vanity wallet keypair
 */
export function getVanityWallet() {
  try {
    const keypair = Keypair.fromSecretKey(VANITY_WALLET_SECRET_KEY);
    console.log('✅ Using vanity wallet:', keypair.publicKey.toBase58());
    return keypair;
  } catch (error) {
    console.error('❌ Error loading vanity wallet:', error);
    throw new Error('Failed to load vanity wallet');
  }
}

/**
 * Get the vanity wallet public key (mint address)
 * @returns {string} The vanity wallet public key in base58 format
 */
export function getVanityWalletAddress() {
  const keypair = getVanityWallet();
  return keypair.publicKey.toBase58();
}

