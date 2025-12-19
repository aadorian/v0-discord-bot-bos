import * as bip39 from "bip39"
import * as bitcoin from "bitcoinjs-lib"
import { BIP32Factory } from "bip32"
import * as ecc from "tiny-secp256k1"
//ecpair package for elliptic curve cryptography operations needed for transaction signing

import { ECPairFactory } from "ecpair"
import type { DatabaseManager } from "./database"

// Initialize BIP32 factory with the ECC library
const bip32 = BIP32Factory(ecc)
const ECPair = ECPairFactory(ecc)

export interface Wallet {
  userId: string
  address: string
  seedPhrase: string
  privateKey: string
  createdAt: Date
}

export class WalletManager {
  private defaultWallet: { address: string; privateKey: string } | null = null

  constructor(private db: DatabaseManager) {
    // Initialize default wallet from seed phrase
    this.initializeDefaultWallet()
  }

  private initializeDefaultWallet(): void {
    const seedPhrase = process.env.DEFAULT_SEED_PHRASE

    if (!seedPhrase) {
      throw new Error("DEFAULT_SEED_PHRASE environment variable is not set")
    }

    // Validate seed phrase
    const normalizedSeedPhrase = seedPhrase.trim().toLowerCase()
    if (!bip39.validateMnemonic(normalizedSeedPhrase)) {
      throw new Error("Invalid DEFAULT_SEED_PHRASE in environment variables")
    }

    // Generate wallet from seed phrase
    this.defaultWallet = this.generateKeysFromSeed(normalizedSeedPhrase)
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

    if (!this.defaultWallet) {
      throw new Error("Default wallet not initialized")
    }

    // Use default address for all users
    const wallet: Wallet = {
      userId,
      address: this.defaultWallet.address,
      seedPhrase: process.env.DEFAULT_SEED_PHRASE || "default-wallet",
      privateKey: this.defaultWallet.privateKey,
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

    if (!this.defaultWallet) {
      throw new Error("Default wallet not initialized")
    }

    // Use default address for all users (import functionality disabled for shared wallet)
    const wallet: Wallet = {
      userId,
      address: this.defaultWallet.address,
      seedPhrase: process.env.DEFAULT_SEED_PHRASE || "default-wallet",
      privateKey: this.defaultWallet.privateKey,
      createdAt: new Date(),
    }

    await this.db.saveWallet(wallet, username)
    return wallet
  }

  async createSelfTransaction(userId: string): Promise<{ txid: string; rawTx: string }> {
    const wallet = await this.getWallet(userId)
    if (!wallet) {
      throw new Error("Wallet not found")
    }

    // Fetch UTXOs for the address
    const utxosResponse = await fetch(`https://mempool.space/testnet4/api/address/${wallet.address}/utxo`)
    if (!utxosResponse.ok) {
      throw new Error("Failed to fetch UTXOs")
    }

    const utxos = (await utxosResponse.json()) as Array<{
      txid: string
      vout: number
      status: { confirmed: boolean }
      value: number
    }>

    if (utxos.length === 0) {
      throw new Error("No UTXOs available. You need to fund your wallet first.")
    }

    // Use the first UTXO
    const utxo = utxos[0]

    // Create the transaction
    const network = bitcoin.networks.testnet
    const psbt = new bitcoin.Psbt({ network })

    // Fetch the transaction hex for the input
    const txResponse = await fetch(`https://mempool.space/testnet4/api/tx/${utxo.txid}/hex`)
    if (!txResponse.ok) {
      throw new Error("Failed to fetch transaction hex")
    }
    const txHex = await txResponse.text()

    // Add input
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo: {
        script: bitcoin.payments.p2wpkh({
          pubkey: Buffer.from(
            bip32.fromSeed(bip39.mnemonicToSeedSync(wallet.seedPhrase)).derivePath("m/84'/1'/0'/0/0").publicKey,
          ),
          network,
        }).output!,
        value: utxo.value,
      },
    })

    // Calculate fee (estimated at 1 sat/vB, ~150 vB for a simple tx)
    const estimatedFee = 150

    // Add output (send to same address, minus fee)
    const outputAmount = utxo.value - estimatedFee
    if (outputAmount <= 0) {
      throw new Error("UTXO value too small to cover fees")
    }

    psbt.addOutput({
      address: wallet.address,
      value: outputAmount,
    })

    // Sign the transaction
    const privateKeyBuffer = Buffer.from(wallet.privateKey, "hex")
    const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, { network })

    // Create a signer compatible with PSBT
    const signer = {
      publicKey: Buffer.from(keyPair.publicKey),
      sign: (hash: Buffer) => Buffer.from(keyPair.sign(hash)),
    }

    psbt.signInput(0, signer)
    psbt.finalizeAllInputs()

    // Extract the transaction
    const tx = psbt.extractTransaction()
    const rawTx = tx.toHex()
    const txid = tx.getId()

    // Broadcast the transaction
    const broadcastResponse = await fetch("https://mempool.space/testnet4/api/tx", {
      method: "POST",
      body: rawTx,
    })

    if (!broadcastResponse.ok) {
      const errorText = await broadcastResponse.text()
      throw new Error(`Failed to broadcast transaction: ${errorText}`)
    }

    const broadcastedTxid = await broadcastResponse.text()

    return { txid: broadcastedTxid, rawTx }
  }

}
