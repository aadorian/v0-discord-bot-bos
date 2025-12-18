import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js"
import { config } from "dotenv"
import { WalletManager } from "./wallet"
import { MiningManager } from "./mining"
import { AirdropManager } from "./airdrop"
import { DatabaseManager } from "./database"

config()

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
})

const db = new DatabaseManager()
const walletManager = new WalletManager(db)
const miningManager = new MiningManager()
const airdropManager = new AirdropManager(db, walletManager)

// Define slash commands
const commands = [
  new SlashCommandBuilder()
    .setName("airdrop-start")
    .setDescription("Start the airdrop process - create your wallet and begin mining"),

  new SlashCommandBuilder()
    .setName("airdrop-import")
    .setDescription("Import an existing wallet using your 12-word seed phrase")
    .addStringOption((option) =>
      option
        .setName("seedphrase")
        .setDescription("Your 12-word seed phrase (space-separated)")
        .setRequired(true),
    ),

  new SlashCommandBuilder().setName("airdrop-wallet").setDescription("Get your wallet address and balance"),

  new SlashCommandBuilder()
    .setName("airdrop-mine")
    .setDescription("Start mining tokens")
    .addIntegerOption((option) =>
      option.setName("duration").setDescription("Mining duration in seconds (default: 60)").setRequired(false),
    ),

  new SlashCommandBuilder().setName("airdrop-claim").setDescription("Claim your mined tokens"),

  new SlashCommandBuilder().setName("airdrop-balance").setDescription("Check your token balance"),

  new SlashCommandBuilder().setName("airdrop-leaderboard").setDescription("View the top miners"),

  new SlashCommandBuilder().setName("airdrop-stats").setDescription("View your mining statistics"),

  new SlashCommandBuilder()
    .setName("btc-info")
    .setDescription("Display Bitcoin technical data structures and types"),
].map((command) => command.toJSON())

// Register slash commands
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!)

client.once("ready", async () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user?.tag}`)

  try {
    console.log("🔄 Refreshing application commands...")
    await rest.put(Routes.applicationCommands(client.user!.id), { body: commands })
    console.log("✅ Successfully registered application commands.")
  } catch (error) {
    console.error("❌ Error registering commands:", error)
  }
})

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  const userId = interaction.user.id
  const username = interaction.user.username

  try {
    await interaction.deferReply({ ephemeral: false })

    switch (interaction.commandName) {
      case "airdrop-start": {
        const wallet = await walletManager.createWallet(userId, username)

        await interaction.editReply({
          content:
            `🎉 **Welcome to the CHARMS Airdrop!**\n\n` +
            `✅ Your wallet has been created!\n` +
            `📍 **Address:** \`${wallet.address}\`\n\n` +
            `**Next Steps:**\n` +
            `1️⃣ Use \`/airdrop-mine\` to start mining tokens\n` +
            `2️⃣ Use \`/airdrop-claim\` to claim your rewards\n` +
            `3️⃣ Use \`/airdrop-balance\` to check your balance\n\n` +
            `⚠️ **Keep your seed phrase safe!** Use \`/airdrop-wallet\` to view it privately.`,
        })
        break
      }

      case "airdrop-wallet": {
        const importSeedPhrase = interaction.options.getString("import")

        // If import option is provided, handle wallet import
        if (importSeedPhrase) {
          // Delete the command message immediately for security
          await interaction.deleteReply()

          try {
            const wallet = await walletManager.importWallet(userId, username, importSeedPhrase)

            await interaction.followUp({
              ephemeral: true,
              content:
                `✅ **Wallet Imported Successfully!**\n\n` +
                `📍 **Address:** \`${wallet.address}\`\n\n` +
                `**Next Steps:**\n` +
                `1️⃣ Use \`/airdrop-mine\` to start mining tokens\n` +
                `2️⃣ Use \`/airdrop-claim\` to claim your rewards\n` +
                `3️⃣ Use \`/airdrop-balance\` to check your balance\n\n` +
                `🔒 Your seed phrase has been securely imported and stored.`,
            })
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to import wallet"
            await interaction.followUp({
              ephemeral: true,
              content: `❌ **Import Failed:** ${errorMessage}`,
            })
          }
          return
        }

        // Otherwise, show wallet information
        const wallet = await walletManager.getWallet(userId)

        if (!wallet) {
          await interaction.editReply({
            content: "❌ You don't have a wallet yet! Use `/airdrop-start` to create one.",
          })
          return
        }

        // Fetch Bitcoin balance from testnet4
        let btcBalanceText = ""
        try {
          const btcBalance = await walletManager.getBitcoinBalance(wallet.address)
          btcBalanceText =
            `\n**Bitcoin Balance (Testnet4):**\n` +
            `• Confirmed: \`${btcBalance.confirmed.toFixed(8)}\` BTC\n` +
            `• Unconfirmed: \`${btcBalance.unconfirmed.toFixed(8)}\` BTC\n` +
            `• Total: \`${btcBalance.total.toFixed(8)}\` BTC\n`
        } catch (error) {
          btcBalanceText = `\n**Bitcoin Balance:** Unable to fetch\n`
        }

        // Send wallet info as ephemeral message
        await interaction.deleteReply()
        await interaction.followUp({
          ephemeral: true,
          content:
            `🔐 **Your Wallet Information**\n\n` +
            `**Address:** \`${wallet.address}\`\n` +
            `**Seed Phrase:** ||\`${wallet.seedPhrase}\`||\n` +
            btcBalanceText +
            `\n⚠️ **NEVER share your seed phrase with anyone!**`,
        })
        break
      }

      case "airdrop-mine": {
        const wallet = await walletManager.getWallet(userId)

        if (!wallet) {
          await interaction.editReply({
            content: "❌ You don't have a wallet yet! Use `/airdrop-start` to create one.",
          })
          return
        }

        const duration = interaction.options.getInteger("duration") || 60

        if (duration < 10 || duration > 300) {
          await interaction.editReply({
            content: "❌ Mining duration must be between 10 and 300 seconds.",
          })
          return
        }

        await interaction.editReply({
          content:
            `⛏️ **Mining Started!**\n\n` +
            `Finding the hash with maximum leading zero bits...\n` +
            `Duration: ${duration} seconds\n\n` +
            `🔄 Mining in progress...`,
        })

        const result = await miningManager.mine(userId, duration)

        await interaction.followUp({
          content:
            `✅ **Mining Complete!**\n\n` +
            `🏆 **Best Hash Found:**\n` +
            `\`${result.hash}\`\n\n` +
            `📊 **Mining Stats:**\n` +
            `• Nonce: \`${result.nonce}\`\n` +
            `• Zero Bits: \`${result.zeroBits}\`\n` +
            `• Attempts: \`${result.attempts.toLocaleString()}\`\n\n` +
            `💰 **Estimated Reward:** \`${result.reward.toFixed(2)}\` CHARMS\n\n` +
            `Use \`/airdrop-claim\` to claim your tokens!`,
        })
        break
      }

      case "airdrop-claim": {
        const wallet = await walletManager.getWallet(userId)

        if (!wallet) {
          await interaction.editReply({
            content: "❌ You don't have a wallet yet! Use `/airdrop-start` to create one.",
          })
          return
        }

        const claim = await airdropManager.claimTokens(userId)

        if (!claim.success) {
          await interaction.editReply({
            content: `❌ ${claim.message}`,
          })
          return
        }

        await interaction.editReply({
          content:
            `🎉 **Tokens Claimed Successfully!**\n\n` +
            `💰 **Amount:** \`${claim.amount!.toFixed(2)}\` CHARMS\n` +
            `📊 **New Balance:** \`${claim.newBalance!.toFixed(2)}\` CHARMS\n` +
            `🔗 **Transaction ID:** \`${claim.txId}\`\n\n` +
            `Congratulations! Your tokens have been added to your wallet.`,
        })
        break
      }

      case "airdrop-balance": {
        const balance = await airdropManager.getBalance(userId)

        if (balance === null) {
          await interaction.editReply({
            content: "❌ You don't have a wallet yet! Use `/airdrop-start` to create one.",
          })
          return
        }

        const stats = await airdropManager.getUserStats(userId)

        await interaction.editReply({
          content:
            `💰 **Your Token Balance**\n\n` +
            `**Balance:** \`${balance.toFixed(2)}\` CHARMS\n\n` +
            `📊 **Statistics:**\n` +
            `• Total Mined: \`${stats.totalMined.toFixed(2)}\` CHARMS\n` +
            `• Total Claims: \`${stats.totalClaims}\`\n` +
            `• Mining Sessions: \`${stats.miningSessions}\`\n` +
            `• Best Zero Bits: \`${stats.bestZeroBits}\``,
        })
        break
      }

      case "airdrop-leaderboard": {
        const leaderboard = await airdropManager.getLeaderboard(10)

        if (leaderboard.length === 0) {
          await interaction.editReply({
            content: "📊 No one has started mining yet! Be the first!",
          })
          return
        }

        let leaderboardText = "🏆 **Top Miners Leaderboard**\n\n"

        leaderboard.forEach((entry, index) => {
          const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`
          leaderboardText += `${medal} **${entry.username}**\n`
          leaderboardText += `   💰 ${entry.balance.toFixed(2)} CHARMS | ⛏️ ${entry.totalMined.toFixed(2)} mined\n\n`
        })

        await interaction.editReply({ content: leaderboardText })
        break
      }

      case "airdrop-stats": {
        const stats = await airdropManager.getUserStats(userId)

        if (!stats) {
          await interaction.editReply({
            content: "❌ You don't have a wallet yet! Use `/airdrop-start` to create one.",
          })
          return
        }

        const rank = await airdropManager.getUserRank(userId)

        await interaction.editReply({
          content:
            `📊 **Your Mining Statistics**\n\n` +
            `**Overall Performance:**\n` +
            `• Rank: #${rank}\n` +
            `• Total Mined: \`${stats.totalMined.toFixed(2)}\` CHARMS\n` +
            `• Current Balance: \`${stats.balance.toFixed(2)}\` CHARMS\n\n` +
            `**Mining History:**\n` +
            `• Mining Sessions: \`${stats.miningSessions}\`\n` +
            `• Total Claims: \`${stats.totalClaims}\`\n` +
            `• Best Zero Bits: \`${stats.bestZeroBits}\`\n` +
            `• Average Reward: \`${stats.averageReward.toFixed(2)}\` CHARMS`,
        })
        break
      }

      case "btc-info": {
        const wallet = await walletManager.getWallet(userId)

        if (!wallet) {
          await interaction.editReply({
            content: "❌ You don't have a wallet yet! Use `/airdrop-start` to create one.",
          })
          return
        }

        await interaction.editReply({
          content:
            `🔧 **Bitcoin Technical Data Structures**\n\n` +
            `**Core Types:**\n` +
            `• **Address**: Bitcoin address for receiving/sending\n` +
            `• **Amount**: Value in satoshis (1 BTC = 100,000,000 sats)\n` +
            `• **FeeRate**: Transaction fee per virtual byte (sat/vB)\n` +
            `• **Network**: Bitcoin network (mainnet/testnet/regtest)\n\n` +
            `**Script & Signature Types:**\n` +
            `• **ScriptBuf**: Script containing spending conditions\n` +
            `• **TapLeafHash**: Hash of a Taproot script leaf\n` +
            `• **TapSighashType**: Taproot signature hash type\n` +
            `• **XOnlyPublicKey**: 32-byte x-only public key for Taproot\n\n` +
            `**Transaction Components:**\n` +
            `• **Transaction**: Complete Bitcoin transaction\n` +
            `• **TxIn**: Transaction input (spending previous output)\n` +
            `• **TxOut**: Transaction output (receiving address + amount)\n` +
            `• **Txid**: Transaction identifier (32-byte hash)\n\n` +
            `**Advanced Types:**\n` +
            `• **OutPoint**: Reference to a specific output (txid + index)\n` +
            `• **Witness**: Segregated witness data for SegWit txs\n` +
            `• **Weight**: Transaction weight units (max 400,000)\n\n` +
            `📍 **Your Address:** \`${wallet.address}\`\n` +
            `🌐 **Network:** Bitcoin Testnet4`,
        })
        break
      }
    }
  } catch (error) {
    console.error("Error handling command:", error)

    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred"

    if (interaction.deferred) {
      await interaction.editReply({
        content: `❌ **Error:** ${errorMessage}`,
      })
    } else {
      await interaction.reply({
        content: `❌ **Error:** ${errorMessage}`,
        ephemeral: true,
      })
    }
  }
})

// Start the bot
client.login(process.env.DISCORD_TOKEN)
