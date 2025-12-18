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
