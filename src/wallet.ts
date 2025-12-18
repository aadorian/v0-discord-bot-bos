import * as crypto from "crypto"
import type { DatabaseManager } from "./database"

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

    // Generate seed phrase (12 words)
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
    // Simple word list for demonstration
    const words = [
      "abandon",
      "ability",
      "able",
      "about",
      "above",
      "absent",
      "absorb",
      "abstract",
      "absurd",
      "abuse",
      "access",
      "accident",
      "account",
      "accuse",
      "achieve",
      "acid",
      "acoustic",
      "acquire",
      "across",
      "act",
      "action",
      "actor",
      "actress",
      "actual",
      "adapt",
      "add",
      "addict",
      "address",
      "adjust",
      "admit",
      "adult",
      "advance",
      "advice",
      "aerobic",
      "affair",
      "afford",
      "afraid",
      "again",
      "age",
      "agent",
      "agree",
      "ahead",
      "aim",
      "air",
      "airport",
      "aisle",
      "alarm",
      "album",
      "alcohol",
      "alert",
      "alien",
      "all",
      "alley",
      "allow",
      "almost",
      "alone",
      "alpha",
      "already",
      "also",
      "alter",
      "always",
      "amateur",
      "amazing",
      "among",
      "amount",
      "amused",
      "analyst",
      "anchor",
      "ancient",
      "anger",
      "angle",
      "angry",
      "animal",
      "ankle",
      "announce",
      "annual",
      "another",
      "answer",
      "antenna",
      "antique",
      "anxiety",
      "any",
      "apart",
      "apology",
      "appear",
      "apple",
      "approve",
      "april",
      "arch",
      "arctic",
      "area",
      "arena",
      "argue",
      "arm",
      "armed",
      "armor",
      "army",
      "around",
      "arrange",
      "arrest",
      "arrive",
      "arrow",
      "art",
      "artefact",
      "artist",
      "artwork",
      "ask",
      "aspect",
      "assault",
      "asset",
      "assist",
      "assume",
    ]

    const seedWords: string[] = []
    for (let i = 0; i < 12; i++) {
      const randomIndex = crypto.randomInt(0, words.length)
      seedWords.push(words[randomIndex])
    }

    return seedWords.join(" ")
  }

  private generateKeysFromSeed(seedPhrase: string): { privateKey: string; address: string } {
    // Generate deterministic keys from seed phrase
    const hash = crypto.createHash("sha256").update(seedPhrase).digest("hex")
    const privateKey = hash

    // Generate address from private key (simplified)
    const addressHash = crypto.createHash("sha256").update(privateKey).digest("hex")
    const address = "bc1" + addressHash.substring(0, 39)

    return { privateKey, address }
  }
}
