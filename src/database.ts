import type { Wallet } from "./wallet"
import type { MiningResult } from "./mining"
import type { UserStats, LeaderboardEntry } from "./airdrop"

interface UserData {
  userId: string
  username: string
  wallet: Wallet
  balance: number
  totalMined: number
  totalClaims: number
  miningSessions: number
  bestZeroBits: number
  pendingReward: number
  miningHistory: MiningResult[]
  claimHistory: ClaimRecord[]
  createdAt: Date
}

interface ClaimRecord {
  amount: number
  txId: string
  timestamp: Date
}

export class DatabaseManager {
  private users: Map<string, UserData> = new Map()

  async saveWallet(wallet: Wallet, username: string): Promise<void> {
    const userData: UserData = {
      userId: wallet.userId,
      username,
      wallet,
      balance: 0,
      totalMined: 0,
      totalClaims: 0,
      miningSessions: 0,
      bestZeroBits: 0,
      pendingReward: 0,
      miningHistory: [],
      claimHistory: [],
      createdAt: new Date(),
    }

    this.users.set(wallet.userId, userData)
  }

  async getWallet(userId: string): Promise<Wallet | null> {
    const user = this.users.get(userId)
    return user ? user.wallet : null
  }

  async saveMiningResult(result: MiningResult): Promise<void> {
    const user = this.users.get(result.userId)

    if (!user) {
      throw new Error("User not found")
    }

    user.miningHistory.push(result)
    user.miningSessions++
    user.pendingReward += result.reward

    if (result.zeroBits > user.bestZeroBits) {
      user.bestZeroBits = result.zeroBits
    }
  }

  async getPendingReward(userId: string): Promise<number> {
    const user = this.users.get(userId)
    return user ? user.pendingReward : 0
  }

  async addTokens(userId: string, amount: number): Promise<number> {
    const user = this.users.get(userId)

    if (!user) {
      throw new Error("User not found")
    }

    user.balance += amount
    user.totalMined += amount

    return user.balance
  }

  async clearPendingReward(userId: string): Promise<void> {
    const user = this.users.get(userId)

    if (user) {
      user.pendingReward = 0
    }
  }

  async recordClaim(userId: string, amount: number, txId: string): Promise<void> {
    const user = this.users.get(userId)

    if (!user) {
      throw new Error("User not found")
    }

    user.claimHistory.push({
      amount,
      txId,
      timestamp: new Date(),
    })

    user.totalClaims++
  }

  async getBalance(userId: string): Promise<number | null> {
    const user = this.users.get(userId)
    return user ? user.balance : null
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const user = this.users.get(userId)

    if (!user) {
      return {
        balance: 0,
        totalMined: 0,
        totalClaims: 0,
        miningSessions: 0,
        bestZeroBits: 0,
        averageReward: 0,
      }
    }

    const averageReward = user.miningSessions > 0 ? user.totalMined / user.miningSessions : 0

    return {
      balance: user.balance,
      totalMined: user.totalMined,
      totalClaims: user.totalClaims,
      miningSessions: user.miningSessions,
      bestZeroBits: user.bestZeroBits,
      averageReward,
    }
  }

  async getLeaderboard(limit: number): Promise<LeaderboardEntry[]> {
    const entries = Array.from(this.users.values())
      .map((user) => ({
        userId: user.userId,
        username: user.username,
        balance: user.balance,
        totalMined: user.totalMined,
      }))
      .sort((a, b) => b.balance - a.balance)
      .slice(0, limit)

    return entries
  }

  async getUserRank(userId: string): Promise<number> {
    const user = this.users.get(userId)

    if (!user) {
      return 0
    }

    const sorted = Array.from(this.users.values()).sort((a, b) => b.balance - a.balance)

    const rank = sorted.findIndex((u) => u.userId === userId)
    return rank + 1
  }

  async clearUserData(userId: string): Promise<boolean> {
    return this.users.delete(userId)
  }
}
