import * as bip39 from "bip39"
import * as bitcoin from "bitcoinjs-lib"
import { BIP32Factory } from "bip32"
import * as ecc from "tiny-secp256k1"
import type { DatabaseManager } from "./database"

// Initialize BIP32 factory with the ECC library
const bip32 = BIP32Factory(ecc)

export interface Wallet {
  userId: string
  address: string
  seedPhrase: string
  privateKey: string
  createdAt: Date
}

export class WalletManager {
  constructor(private db: DatabaseManager) {}

  async getBitcoinBalance(address: string): Promise<{ confirmed: number; unconfirmed: number; total: number }> {
    try {
      // Use mempool.space API for testnet4
      const response = await fetch(`https://mempool.space/testnet4/api/address/${address}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.statusText}`)
      }

      const data = (await response.json()) as {
        chain_stats: { funded_txo_sum: number; spent_txo_sum: number }
        mempool_stats: { funded_txo_sum: number; spent_txo_sum: number }
      }

      // Convert satoshis to BTC
      const confirmed = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) / 100000000
      const unconfirmed = (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum) / 100000000
      const total = confirmed + unconfirmed

      return { confirmed, unconfirmed, total }
    } catch (error) {
      console.error("Error fetching Bitcoin balance:", error)
      throw new Error("Failed to fetch Bitcoin balance from mempool")
    }
  }

  async createWallet(userId: string, username: string): Promise<Wallet> {
    // Check if wallet already exists
    const existing = await this.db.getWallet(userId)
    if (existing) {
      return existing
    }

    // Generate seed phrase (12 words) using BIP39
    const seedPhrase = this.generateSeedPhrase()

    // Generate keys from seed
    const { privateKey, address } = this.generateKeysFromSeed(seedPhrase)

    const wallet: Wallet = {
      userId,
      address,
      seedPhrase,
      privateKey,
      createdAt: new Date(),
    }

    await this.db.saveWallet(wallet, username)
    return wallet
  }

  async getWallet(userId: string): Promise<Wallet | null> {
    return this.db.getWallet(userId)
  }

  async importWallet(userId: string, username: string, seedPhrase: string): Promise<Wallet> {
    // Check if wallet already exists
    const existing = await this.db.getWallet(userId)
    if (existing) {
      throw new Error("You already have a wallet. Cannot import when a wallet exists.")
    }

    // Validate seed phrase
    const normalizedSeedPhrase = seedPhrase.trim().toLowerCase()
    if (!bip39.validateMnemonic(normalizedSeedPhrase)) {
      throw new Error("Invalid seed phrase. Please check your 12-word seed phrase and try again.")
    }

    // Generate keys from the imported seed phrase
    const { privateKey, address } = this.generateKeysFromSeed(normalizedSeedPhrase)

    const wallet: Wallet = {
      userId,
      address,
      seedPhrase: normalizedSeedPhrase,
      privateKey,
      createdAt: new Date(),
    }

    await this.db.saveWallet(wallet, username)
    return wallet
  }

  private generateSeedPhrase(): string {
    // Generate a proper BIP39 mnemonic (12 words)
    return bip39.generateMnemonic(128)
  }

  private generateKeysFromSeed(seedPhrase: string): { privateKey: string; address: string } {
    // Convert mnemonic to seed
    const seed = bip39.mnemonicToSeedSync(seedPhrase)

    // Use BIP32 to derive the key
    const network = bitcoin.networks.testnet
    const root = bip32.fromSeed(seed)

    // Derive path m/84'/1'/0'/0/0 (BIP84 for native SegWit on testnet)
    const path = "m/84'/1'/0'/0/0"
    const child = root.derivePath(path)

    if (!child.privateKey) {
      throw new Error("Failed to derive private key")
    }

    // Get private key as hex
    const privateKey = Buffer.from(child.privateKey).toString("hex")

    // Create P2WPKH (native SegWit) address for testnet
    const { address: btcAddress } = bitcoin.payments.p2wpkh({
      pubkey: Buffer.from(child.publicKey),
      network: network,
    })

    if (!btcAddress) {
      throw new Error("Failed to generate address")
    }

    return { privateKey, address: btcAddress }
  }
}
