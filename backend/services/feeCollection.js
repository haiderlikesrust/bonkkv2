import { Connection, PublicKey, VersionedTransaction, Keypair, SystemProgram, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';
import axios from 'axios';
import tokenService from './token.js';
import userService from './user.js';
import { config } from '../config/config.js';

/**
 * Fee Collection Service
 * Collects creator fees and distributes them according to fee distribution settings
 */
class FeeCollectionService {
  constructor() {
    this.connection = new Connection(
      config.solana.rpcUrl || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    this.pumpPortalUrl = config.pumpPortal.baseUrl || 'https://pumpportal.fun';
    this.isRunning = false;
  }

  /**
   * Get top N token holders for a token
   * Uses Solana RPC to get token accounts
   * Note: This is a simplified version. For production, consider using a token holder API
   */
  async getTopHolders(mintAddress, topN = 10) {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      
      // Get all token accounts for this mint using getProgramAccounts
      const accounts = await this.connection.getParsedProgramAccounts(
        new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // SPL Token Program
        {
          filters: [
            {
              dataSize: 165, // Token account data size
            },
            {
              memcmp: {
                offset: 0,
                bytes: mintPubkey.toBase58(),
              },
            },
          ],
        }
      );

      // Parse and sort by balance
      const holders = accounts
        .map(account => {
          try {
            const parsedInfo = account.account.data.parsed.info;
            const owner = parsedInfo.owner;
            const tokenAmount = parsedInfo.tokenAmount;
            
            return {
              address: owner,
              balance: parseFloat(tokenAmount.uiAmountString || tokenAmount.uiAmount || 0),
              account: account.pubkey.toBase58(),
            };
          } catch (parseError) {
            console.warn('Error parsing account:', parseError);
            return null;
          }
        })
        .filter(h => h && h.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, topN);

      console.log(`📊 Found ${holders.length} top holders for ${mintAddress}`);
      return holders;
    } catch (error) {
      console.error(`Error getting top holders for ${mintAddress}:`, error.message);
      // Return empty array on error so the process can continue
      return [];
    }
  }

  /**
   * Collect creator fees using PumpPortal API
   */
  async collectCreatorFees(mintAddress, creatorPrivateKey) {
    try {
      const creatorKeypair = Keypair.fromSecretKey(bs58.decode(creatorPrivateKey));
      const publicKey = creatorKeypair.publicKey.toBase58();

      const response = await axios.post(
        `${this.pumpPortalUrl}/api/trade-local`,
        {
          publicKey: publicKey,
          action: 'collectCreatorFee',
          priorityFee: 0.000001,
          ...(mintAddress && { mint: mintAddress }), // Include mint if provided
        },
        {
          responseType: 'arraybuffer',
        }
      );

      if (response.status === 200) {
        const tx = VersionedTransaction.deserialize(new Uint8Array(response.data));
        tx.sign([creatorKeypair]);
        
        try {
          const signature = await this.connection.sendTransaction(tx);
          await this.connection.confirmTransaction(signature, 'confirmed');
          
          console.log(`✅ Collected fees for ${mintAddress}: https://solscan.io/tx/${signature}`);
          return { success: true, signature };
        } catch (txError) {
          // Check if transaction was already processed (fees already collected)
          const errorMessage = txError.message || '';
          if (errorMessage.includes('already been processed') || 
              errorMessage.includes('already processed') ||
              errorMessage.includes('Transaction has already been processed')) {
            console.log(`ℹ️  Fees already collected for ${mintAddress}, skipping...`);
            return { success: true, alreadyCollected: true, message: 'Fees already collected' };
          }
          // Re-throw other transaction errors
          throw txError;
        }
      } else {
        console.error(`Failed to collect fees for ${mintAddress}: ${response.statusText}`);
        return { success: false, error: response.statusText };
      }
    } catch (error) {
      // Check if it's an "already processed" error
      const errorMessage = error.message || '';
      if (errorMessage.includes('already been processed') || 
          errorMessage.includes('already processed') ||
          errorMessage.includes('Transaction has already been processed')) {
        console.log(`ℹ️  Fees already collected for ${mintAddress}, skipping...`);
        return { success: true, alreadyCollected: true, message: 'Fees already collected' };
      }
      
      console.error(`Error collecting fees for ${mintAddress}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SOL to an address
   */
  async sendSOL(fromKeypair, toAddress, amountSOL) {
    try {
      const toPubkey = new PublicKey(toAddress);
      const lamports = Math.floor(amountSOL * 1e9);

      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPubkey,
        lamports: lamports,
      });

      // Create and send transaction
      const transaction = new Transaction().add(transferInstruction);
      
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromKeypair.publicKey;
      
      transaction.sign(fromKeypair);

      const signature = await this.connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      });
      
      await this.connection.confirmTransaction(signature, 'confirmed');

      console.log(`✅ Sent ${amountSOL} SOL to ${toAddress}: https://solscan.io/tx/${signature}`);
      return { success: true, signature };
    } catch (error) {
      console.error(`Error sending SOL to ${toAddress}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Buy token using PumpPortal API (for buyback/flywheel)
   */
  async buyToken(mintAddress, buyerPrivateKey, amountSOL) {
    try {
      const buyerKeypair = Keypair.fromSecretKey(bs58.decode(buyerPrivateKey));
      const publicKey = buyerKeypair.publicKey.toBase58();

      const response = await axios.post(
        `${this.pumpPortalUrl}/api/trade-local`,
        {
          publicKey: publicKey,
          action: 'buy',
          mint: mintAddress,
          amount: amountSOL,
          denominatedInSol: 'true',
          slippage: 10,
          priorityFee: 0.000001,
        },
        {
          responseType: 'arraybuffer',
        }
      );

      if (response.status === 200) {
        const tx = VersionedTransaction.deserialize(new Uint8Array(response.data));
        tx.sign([buyerKeypair]);
        
        const signature = await this.connection.sendTransaction(tx);
        await this.connection.confirmTransaction(signature, 'confirmed');
        
        return { success: true, signature };
      } else {
        return { success: false, error: response.statusText };
      }
    } catch (error) {
      console.error(`Error buying token ${mintAddress}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Buy BONK token (for supportBonkv2 distribution)
   */
  async buyBONK(buyerPrivateKey, amountSOL) {
    // BONK token mint address on Solana
    const BONK_MINT = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';
    return this.buyToken(BONK_MINT, buyerPrivateKey, amountSOL);
  }

  /**
   * Collect and distribute fees for a single token
   */
  async collectAndDistributeFees(token) {
    try {
      console.log(`\n🔄 Processing fee collection for token: ${token.name} (${token.mint})`);

      // Get creator's private key
      const creatorPrivateKey = await userService.getUserPrivateKey(
        token.creatorUserId,
        config.jwtSecret
      );

      if (!creatorPrivateKey) {
        console.error(`❌ No private key found for creator user ${token.creatorUserId}`);
        return { success: false, error: 'Creator private key not found' };
      }

      const creatorKeypair = Keypair.fromSecretKey(bs58.decode(creatorPrivateKey));

      // Get initial balance before attempting collection
      const balanceBefore = await this.connection.getBalance(creatorKeypair.publicKey);
      const balanceBeforeSOL = balanceBefore / 1e9;
      
      // Step 1: Try to collect creator fees
      console.log(`📥 Attempting to collect creator fees...`);
      const collectResult = await this.collectCreatorFees(token.mint, creatorPrivateKey);
      
      if (!collectResult.success) {
        console.error(`❌ Failed to collect fees: ${collectResult.error}`);
        return collectResult;
      }

      // Wait for balance to update after collection attempt
      await new Promise(resolve => setTimeout(resolve, 3000));
      const balanceAfter = await this.connection.getBalance(creatorKeypair.publicKey);
      const balanceAfterSOL = balanceAfter / 1e9;
      const balanceChange = balanceAfterSOL - balanceBeforeSOL;
      
      // Calculate fees available for distribution
      let totalFeesCollected = 0;
      
      if (collectResult.alreadyCollected) {
        // Fees were already collected previously but may not have been distributed
        // Check balance change to see if new fees were collected or if we should distribute existing fees
        if (balanceChange > 0.0001) {
          // Balance increased significantly - new fees were collected despite the error
          totalFeesCollected = balanceChange;
          console.log(`✅ New fees detected (${totalFeesCollected.toFixed(6)} SOL) despite collection transaction being already processed`);
        } else if (balanceChange < -0.0001) {
          // Balance decreased - transaction fees only, no new fees collected
          // However, fees may have been collected previously and are still in wallet
          // For now, skip distribution as we can't determine the amount without tracking
          console.log(`⚠️  Collection already processed and no new fees (balance decreased by ${Math.abs(balanceChange).toFixed(6)} SOL)`);
          console.log(`ℹ️  If fees were collected previously but not distributed, they remain in the wallet but amount cannot be determined automatically`);
          return { success: true, message: 'Fees already collected - distribution amount cannot be determined', collectedAmount: 0, alreadyCollected: true };
        } else {
          // Balance unchanged - collection was already processed
          // Fees may have been collected previously but not distributed
          // Since we can't determine the amount, we'll skip automatic distribution
          console.log(`ℹ️  Fees already collected previously. If distribution hasn't occurred, fees remain in wallet but amount cannot be determined automatically`);
          return { success: true, message: 'Fees already collected - distribution amount cannot be determined', collectedAmount: 0, alreadyCollected: true };
        }
      } else {
        // Fees were just collected now
        if (balanceChange <= 0) {
          console.log(`⚠️  No fees collected (balance decreased by ${Math.abs(balanceChange).toFixed(6)} SOL due to transaction fees)`);
          return { success: true, message: 'No fees to distribute (transaction fees exceeded collected amount)', collectedAmount: 0 };
        }
        totalFeesCollected = balanceChange;
      }

      // Parse fee distribution
      // Default to 100% dev if not set or totals 0%
      let feeDistribution;
      if (!token.feeDistribution) {
        feeDistribution = { holders: 0, dev: 100, flywheel: 0, supportBonkv2: 0 };
        console.log(`📊 No fee distribution set, using default: 100% dev`);
      } else {
        feeDistribution = typeof token.feeDistribution === 'string' 
          ? JSON.parse(token.feeDistribution)
          : token.feeDistribution;
      }

      // Ensure we have valid percentages (default to 0 if not set)
      const holdersFeePercent = feeDistribution.holders || 0;
      const devFeePercent = feeDistribution.dev !== undefined ? (feeDistribution.dev || 0) : 100;
      const flywheelFeePercent = feeDistribution.flywheel || 0;
      const supportBonkv2FeePercent = feeDistribution.supportBonkv2 || 0;
      
      // If total distribution is 0%, default to 100% dev
      const totalPercent = holdersFeePercent + devFeePercent + flywheelFeePercent + supportBonkv2FeePercent;
      const finalHoldersPercent = totalPercent === 0 ? 0 : holdersFeePercent;
      const finalDevPercent = totalPercent === 0 ? 100 : devFeePercent;
      const finalFlywheelPercent = totalPercent === 0 ? 0 : flywheelFeePercent;
      const finalSupportBonkv2Percent = totalPercent === 0 ? 0 : supportBonkv2FeePercent;
      
      if (totalPercent === 0) {
        console.log(`📊 Fee distribution totals 0%, defaulting to 100% dev`);
      }

      console.log(`💰 Total fees collected: ${totalFeesCollected.toFixed(6)} SOL`);
      console.log(`📊 Fee distribution: Holders: ${finalHoldersPercent}%, Dev: ${finalDevPercent}%, Flywheel: ${finalFlywheelPercent}%, SupportBonkv2: ${finalSupportBonkv2Percent}%`);

      const results = {
        collected: collectResult.signature,
        distributions: [],
      };

      // Step 2: Distribute to holders (if holders fee > 0)
      if (finalHoldersPercent > 0) {
        const holdersAmount = (totalFeesCollected * finalHoldersPercent) / 100;
        console.log(`👥 Distributing ${holdersAmount} SOL to top 10 holders...`);
        
        const topHolders = await this.getTopHolders(token.mint, 10);
        
        if (topHolders.length > 0) {
          const amountPerHolder = holdersAmount / topHolders.length;
          console.log(`   Sending ${amountPerHolder.toFixed(6)} SOL to each of ${topHolders.length} holders`);
          
          for (const holder of topHolders) {
            const sendResult = await this.sendSOL(creatorKeypair, holder.address, amountPerHolder);
            results.distributions.push({
              type: 'holder',
              address: holder.address,
              amount: amountPerHolder,
              success: sendResult.success,
              signature: sendResult.signature,
            });
          }
        } else {
          console.log(`   ⚠️  No holders found, skipping holder distribution`);
        }
      }

      // Step 3: Send to dev wallet (if dev fee > 0)
      if (finalDevPercent > 0) {
        const devAmount = (totalFeesCollected * finalDevPercent) / 100;
        console.log(`💼 Sending ${devAmount} SOL to dev wallet (${token.creatorWallet})...`);
        
        const devResult = await this.sendSOL(creatorKeypair, token.creatorWallet, devAmount);
        results.distributions.push({
          type: 'dev',
          address: token.creatorWallet,
          amount: devAmount,
          success: devResult.success,
          signature: devResult.signature,
        });
      }

      // Step 4: Flywheel - Buyback token (if flywheel fee > 0)
      if (finalFlywheelPercent > 0) {
        const flywheelAmount = (totalFeesCollected * finalFlywheelPercent) / 100;
        console.log(`🔄 Flywheel: Buying back ${flywheelAmount} SOL worth of token...`);
        
        const buybackResult = await this.buyToken(token.mint, creatorPrivateKey, flywheelAmount);
        results.distributions.push({
          type: 'flywheel',
          amount: flywheelAmount,
          success: buybackResult.success,
          signature: buybackResult.signature,
        });
      }

      // Step 5: Support Bonkv2 - Buy BONK (if supportBonkv2 fee > 0)
      if (finalSupportBonkv2Percent > 0) {
        const bonkv2Amount = (totalFeesCollected * finalSupportBonkv2Percent) / 100;
        console.log(`🐕 Support Bonkv2: Buying ${bonkv2Amount} SOL worth of BONK...`);
        
        const bonkResult = await this.buyBONK(creatorPrivateKey, bonkv2Amount);
        results.distributions.push({
          type: 'supportBonkv2',
          amount: bonkv2Amount,
          success: bonkResult.success,
          signature: bonkResult.signature,
        });
      }

      console.log(`✅ Fee collection and distribution completed for ${token.name}`);
      return { success: true, results };

    } catch (error) {
      console.error(`❌ Error collecting/distributing fees for ${token.mint}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Collect fees for all tokens that need it
   */
  async collectAllFees() {
    if (this.isRunning) {
      console.log('⏳ Fee collection already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('\n🚀 Starting fee collection process...');

    try {
      // Get all tokens from database
      const tokens = await tokenService.getAllTokens(1000, 0); // Get up to 1000 tokens
      console.log(`📋 Found ${tokens.length} tokens to process`);

      const results = [];

      for (const token of tokens) {
        try {
          const result = await this.collectAndDistributeFees(token);
          results.push({
            token: token.mint,
            name: token.name,
            success: result.success,
            error: result.error,
          });
        } catch (error) {
          console.error(`Error processing token ${token.mint}:`, error);
          results.push({
            token: token.mint,
            name: token.name,
            success: false,
            error: error.message,
          });
        }
      }

      console.log('\n📊 Fee collection summary:');
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      console.log(`   ✅ Successful: ${successful}`);
      console.log(`   ❌ Failed: ${failed}`);

      return results;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start automatic fee collection (runs every hour)
   */
  startAutoCollection(intervalHours = 1) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    console.log(`⏰ Starting automatic fee collection (every ${intervalHours} hour(s))`);
    
    // Run immediately on start
    this.collectAllFees().catch(console.error);
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      this.collectAllFees().catch(console.error);
    }, intervalMs);
  }

  /**
   * Stop automatic fee collection
   */
  stopAutoCollection() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Stopped automatic fee collection');
    }
  }
}

export default new FeeCollectionService();

