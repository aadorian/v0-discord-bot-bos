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
    .setDescription("BOS: Start the airdrop process - create your wallet and begin mining"),

  new SlashCommandBuilder().setName("airdrop-wallet").setDescription("Get your wallet address and balance"),

  new SlashCommandBuilder().setName("airdrop-balance").setDescription("Check your token balance"),

  new SlashCommandBuilder()
    .setName("btc-info")
    .setDescription("Display Bitcoin technical data structures and types"),

  new SlashCommandBuilder()
    .setName("airdrop-myself")
    .setDescription("Send a Bitcoin transaction from your address to itself"),

  new SlashCommandBuilder()
    .setName("airdrop-send")
    .setDescription("Send Bitcoin to another address on testnet4")
    .addStringOption((option) =>
      option
        .setName("address")
        .setDescription("Recipient address (default: tb1pyry0g642yr7qlhe82qd342lr0aztywhth62lnjttxgks8wmgsc9svf9xx2)")
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount to send in satoshis (leave empty to send max minus fees)")
        .setRequired(false)
        .setMinValue(546),
    ),

  new SlashCommandBuilder()
    .setName("sendto")
    .setDescription("Send Bitcoin transaction (like bitcoin-cli sendtoaddress)")
    .addStringOption((option) =>
      option
        .setName("address")
        .setDescription("Recipient Bitcoin address")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount to send in satoshis (leave empty to send max minus fees)")
        .setRequired(false)
        .setMinValue(546),
    ),

  new SlashCommandBuilder()
    .setName("query-tokens")
    .setDescription("Query token information using app identity and UTXOs")
    .addStringOption((option) =>
      option
        .setName("app_id")
        .setDescription("App identity (from original witness UTXO)")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("app_vk")
        .setDescription("App verification key")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("token_utxo")
        .setDescription("Token UTXO (format: txid:vout)")
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("witness_utxo")
        .setDescription("Original witness UTXO (format: txid:vout)")
        .setRequired(false),
    ),

  new SlashCommandBuilder()
    .setName("transactions")
    .setDescription("Get the last 5 transactions for your wallet address")
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Number of transactions to retrieve (default: 5, max: 20)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(20),
    ),

  new SlashCommandBuilder()
    .setName("tx-raw")
    .setDescription("Get raw transaction data and parse charms.dev Token Standard spell")
    .addStringOption((option) =>
      option
        .setName("txid")
        .setDescription("Transaction ID (default: d8786af1e7e597d77c073905fd6fd7053e4d12894eefa19c5deb45842fc2a8a2)")
        .setRequired(false),
    ),
].map((command) => command.toJSON())

// Register slash commands
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!)

client.once("clientReady", async () => {
  console.log(`✅ BOT Bot is ready! Logged in as ${client.user?.tag}`)

  try {
    console.log("🔄 Refreshing application commands...")
    console.log(`📋 Registering ${commands.length} commands:`, commands.map((cmd: any) => cmd.name).join(", "))
    await rest.put(Routes.applicationCommands(client.user!.id), { body: commands })
    console.log("✅ Successfully registered application commands.")
    console.log("📝 Registered commands:", commands.map((cmd: any) => cmd.name).join(", "))
  } catch (error) {
    console.error("❌ Error registering commands:", error)
    if (error instanceof Error) {
      console.error("Error details:", error.message)
      console.error("Stack:", error.stack)
    }
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
            `1️⃣ Use \`/airdrop-balance\` to check your balance\n\n` +
            `⚠️ **Keep your seed phrase safe!** Use \`/airdrop-wallet\` to view it privately.`,
        })
        break
      }

      case "airdrop-wallet": {
        // Show wallet information
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

      case "airdrop-myself": {
        const wallet = await walletManager.getWallet(userId)

        if (!wallet) {
          await interaction.editReply({
            content: "❌ You don't have a wallet yet! Use `/airdrop-start` to create one.",
          })
          return
        }

        await interaction.editReply({
          content: `🔄 **Creating Transaction...**\n\nFetching UTXOs and building transaction...`,
        })

        try {
          const result = await walletManager.createSelfTransaction(userId)

          await interaction.editReply({
            content:
              `✅ **Transaction Sent Successfully!**\n\n` +
              `📍 **From:** \`${wallet.address}\`\n` +
              `📍 **To:** \`${wallet.address}\`\n` +
              `🔗 **Transaction ID:** \`${result.txid}\`\n\n` +
              `🌐 **View on Explorer:**\n` +
              `https://mempool.space/testnet4/tx/${result.txid}\n\n` +
              `⏳ The transaction has been broadcast to the Bitcoin testnet4 network.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
          await interaction.editReply({
            content: `❌ **Transaction Failed**\n\n${errorMessage}`,
          })
        }
        break
      }

      case "airdrop-send": {
        const wallet = await walletManager.getWallet(userId)

        if (!wallet) {
          await interaction.editReply({
            content: "❌ You don't have a wallet yet! Use `/airdrop-start` to create one.",
          })
          return
        }

        // Get options with default recipient address
        const recipientAddress =
          interaction.options.getString("address") || "tb1pyry0g642yr7qlhe82qd342lr0aztywhth62lnjttxgks8wmgsc9svf9xx2"
        const amount = interaction.options.getInteger("amount") || null

        await interaction.editReply({
          content: `🔄 **Creating Transaction...**\n\nFetching UTXOs and building transaction...`,
        })

        try {
          const result = await walletManager.createTransaction(userId, recipientAddress, amount)

          await interaction.editReply({
            content:
              `✅ **Transaction Sent Successfully!**\n\n` +
              `📍 **From:** \`${wallet.address}\`\n` +
              `📍 **To:** \`${recipientAddress}\`\n` +
              `💰 **Amount:** \`${result.sentAmount}\` satoshis (${(result.sentAmount / 100000000).toFixed(8)} BTC)\n` +
              `⚡ **Fee:** \`${result.fee}\` satoshis\n` +
              `🔗 **Transaction ID:** \`${result.txid}\`\n\n` +
              `🌐 **View on Explorer:**\n` +
              `https://mempool.space/testnet4/tx/${result.txid}\n\n` +
              `⏳ The transaction has been broadcast to the Bitcoin testnet4 network.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
          await interaction.editReply({
            content: `❌ **Transaction Failed**\n\n${errorMessage}`,
          })
        }
        break
      }

      case "sendto": {
        const wallet = await walletManager.getWallet(userId)

        if (!wallet) {
          await interaction.editReply({
            content: "❌ You don't have a wallet yet! Use `/airdrop-start` to create one.",
          })
          return
        }

        // Get options - address is required for sendto
        const recipientAddress = interaction.options.getString("address")
        if (!recipientAddress) {
          await interaction.editReply({
            content: "❌ Recipient address is required. Usage: `/sendto address:<address> [amount:<satoshis>]`",
          })
          return
        }

        const amount = interaction.options.getInteger("amount") || null

        await interaction.editReply({
          content: `🔄 **Creating Transaction...**\n\nFetching UTXOs and building transaction...`,
        })

        try {
          const result = await walletManager.createTransaction(userId, recipientAddress, amount)

          await interaction.editReply({
            content:
              `✅ **Transaction Sent Successfully!**\n\n` +
              `📍 **From:** \`${wallet.address}\`\n` +
              `📍 **To:** \`${recipientAddress}\`\n` +
              `💰 **Amount:** \`${result.sentAmount}\` satoshis (${(result.sentAmount / 100000000).toFixed(8)} BTC)\n` +
              `⚡ **Fee:** \`${result.fee}\` satoshis\n` +
              `🔗 **Transaction ID:** \`${result.txid}\`\n\n` +
              `🌐 **View on Explorer:**\n` +
              `https://mempool.space/testnet4/tx/${result.txid}\n\n` +
              `⏳ The transaction has been broadcast to the Bitcoin testnet4 network.`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
          await interaction.editReply({
            content: `❌ **Transaction Failed**\n\n${errorMessage}`,
          })
        }
        break
      }

      case "query-tokens": {
        await interaction.editReply({
          content: `🔄 **Querying Token Information...**\n\nFetching token data from blockchain...`,
        })

        try {
          const appId = interaction.options.getString("app_id") || undefined
          const appVk = interaction.options.getString("app_vk") || undefined
          const tokenUtxo = interaction.options.getString("token_utxo") || undefined
          const witnessUtxo = interaction.options.getString("witness_utxo") || undefined

          const result = await walletManager.queryTokens(appId, appVk, tokenUtxo, witnessUtxo)

          // Parse UTXO information
          const [tokenTxid, tokenVout] = result.tokenUtxo.split(":")
          const [witnessTxid, witnessVout] = result.witnessUtxo.split(":")

          let tokenDetails = ""
          if (result.tokenInfo) {
            const tokenTx = result.tokenInfo as any
            tokenDetails = `**Token UTXO Transaction:**\n` +
              `• TXID: \`${tokenTxid}\`\n` +
              `• Vout: \`${tokenVout}\`\n` +
              `• Status: ${tokenTx.status?.confirmed ? "✅ Confirmed" : "⏳ Unconfirmed"}\n` +
              `• Size: \`${tokenTx.size || "N/A"}\` bytes\n` +
              `• Weight: \`${tokenTx.weight || "N/A"}\`\n\n`
          }

          let witnessDetails = ""
          if (result.utxoData) {
            const witnessTx = result.utxoData as any
            witnessDetails = `**Witness UTXO Transaction:**\n` +
              `• TXID: \`${witnessTxid}\`\n` +
              `• Vout: \`${witnessVout}\`\n` +
              `• Status: ${witnessTx.status?.confirmed ? "✅ Confirmed" : "⏳ Unconfirmed"}\n` +
              `• Size: \`${witnessTx.size || "N/A"}\` bytes\n` +
              `• Weight: \`${witnessTx.weight || "N/A"}\`\n\n`
          }

          await interaction.editReply({
            content:
              `🔍 **Token Query Results**\n\n` +
              `**App Identity:**\n` +
              `• App ID: \`${result.appId}\`\n` +
              `• App Verification Key: \`${result.appVk}\`\n\n` +
              tokenDetails +
              witnessDetails +
              `**UTXO References:**\n` +
              `• Token UTXO: \`${result.tokenUtxo}\`\n` +
              `• Witness UTXO: \`${result.witnessUtxo}\`\n\n` +
              `🌐 **View on Explorer:**\n` +
              `• Token TX: https://mempool.space/testnet4/tx/${tokenTxid}\n` +
              `• Witness TX: https://mempool.space/testnet4/tx/${witnessTxid}`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
          await interaction.editReply({
            content: `❌ **Query Failed**\n\n${errorMessage}`,
          })
        }
        break
      }

      case "transactions": {
        const wallet = await walletManager.getWallet(userId)

        if (!wallet) {
          await interaction.editReply({
            content: "❌ You don't have a wallet yet! Use `/airdrop-start` to create one.",
          })
          return
        }

        const limit = interaction.options.getInteger("limit") || 5

        await interaction.editReply({
          content: `🔄 **Fetching Transactions...**\n\nRetrieving last ${limit} transactions for your address...`,
        })

        try {
          const transactions = await walletManager.getAddressTransactions(wallet.address, limit)

          if (transactions.length === 0) {
            await interaction.editReply({
              content: `📋 **Transaction History**\n\n📍 **Address:** \`${wallet.address}\`\n\n❌ No transactions found for this address.`,
            })
            return
          }

          let transactionsText = `📋 **Last ${transactions.length} Transactions**\n\n📍 **Address:** \`${wallet.address}\`\n\n`

          transactions.forEach((tx, index) => {
            const status = tx.status.confirmed ? "✅ Confirmed" : "⏳ Unconfirmed"
            const blockInfo = tx.status.block_height
              ? ` (Block: ${tx.status.block_height})`
              : ""
            const valueText = tx.value !== undefined
              ? `\n   💰 Value Change: ${tx.value > 0 ? "+" : ""}${(tx.value / 100000000).toFixed(8)} BTC`
              : ""
            const feeText = tx.fee !== undefined ? `\n   ⚡ Fee: ${tx.fee} sats` : ""
            const sizeText = tx.size !== undefined ? `\n   📦 Size: ${tx.size} bytes` : ""

            transactionsText += `${index + 1}. **${status}${blockInfo}**\n`
            transactionsText += `   🔗 TXID: \`${tx.txid}\``
            transactionsText += valueText
            transactionsText += feeText
            transactionsText += sizeText
            transactionsText += `\n   🌐 https://mempool.space/testnet4/tx/${tx.txid}\n\n`
          })

          await interaction.editReply({
            content: transactionsText,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
          await interaction.editReply({
            content: `❌ **Failed to Fetch Transactions**\n\n${errorMessage}`,
          })
        }
        break
      }

      case "tx-raw": {
        const txid = interaction.options.getString("txid") || "d8786af1e7e597d77c073905fd6fd7053e4d12894eefa19c5deb45842fc2a8a2"

        await interaction.editReply({
          content: `🔄 **Fetching Transaction Raw Data...**\n\nRetrieving transaction details and parsing charms.dev Token Standard...`,
        })

        try {
          const txData = await walletManager.getTransactionRawData(txid)

          // Format inputs
          let inputsText = ""
          txData.inputs.forEach((input, index) => {
            inputsText += `\n**Input ${index + 1}:**\n`
            inputsText += `• Previous TXID: \`${input.txid}\`\n`
            inputsText += `• Vout: \`${input.vout}\`\n`
            inputsText += `• Sequence: \`${input.sequence}\`\n`
            if (input.scriptSig) {
              inputsText += `• ScriptSig: \`${input.scriptSig}\`\n`
            }
            if (input.witness && input.witness.length > 0) {
              inputsText += `• Witness: ${input.witness.length} item(s)\n`
              input.witness.forEach((w, i) => {
                if (w.length > 0 && w.length < 200) {
                  inputsText += `  - Witness[${i}]: \`${w}\`\n`
                } else if (w.length >= 200) {
                  inputsText += `  - Witness[${i}]: \`${w.substring(0, 100)}...\` (${w.length} bytes)\n`
                }
              })
            }
          })

          // Format outputs
          let outputsText = ""
          txData.outputs.forEach((output, index) => {
            outputsText += `\n**Output ${index + 1}:**\n`
            outputsText += `• Value: \`${output.value}\` satoshis (${(output.value / 100000000).toFixed(8)} BTC)\n`
            if (output.address) {
              outputsText += `• Address: \`${output.address}\`\n`
            }
            if (output.opReturn) {
              outputsText += `• OP_RETURN: \`${output.opReturn.substring(0, 200)}${output.opReturn.length > 200 ? '...' : ''}\`\n`
            }
            outputsText += `• ScriptPubKey: \`${output.scriptPubKey.substring(0, 100)}${output.scriptPubKey.length > 100 ? '...' : ''}\`\n`
          })

          // Format spell if found
          let spellText = ""
          if (txData.spell) {
            spellText = `\n**🔮 Charms.dev Token Standard Spell:**\n\`\`\`json\n${JSON.stringify(txData.spell, null, 2)}\n\`\`\`\n`
          } else {
            spellText = `\n**🔮 Charms.dev Token Standard Spell:**\n❌ No spell found in transaction (checked OP_RETURN and witness data)\n`
          }

          // Status information
          const statusText = txData.status
            ? `\n**Status:**\n` +
              `• Confirmed: ${txData.status.confirmed ? "✅ Yes" : "⏳ No"}\n` +
              (txData.status.block_height ? `• Block Height: \`${txData.status.block_height}\`\n` : "") +
              (txData.status.block_hash ? `• Block Hash: \`${txData.status.block_hash}\`\n` : "") +
              (txData.status.block_time ? `• Block Time: \`${new Date(txData.status.block_time * 1000).toISOString()}\`\n` : "")
            : ""

          await interaction.editReply({
            content:
              `📋 **Transaction Raw Data**\n\n` +
              `**Transaction ID:** \`${txData.txid}\`\n` +
              `**Size:** \`${txData.size}\` bytes\n` +
              `**Weight:** \`${txData.weight}\`\n` +
              (txData.fee ? `**Fee:** \`${txData.fee}\` satoshis\n` : "") +
              statusText +
              `\n**Raw Hex:**\n\`\`\`\n${txData.rawHex.substring(0, 500)}${txData.rawHex.length > 500 ? '...' : ''}\n\`\`\`` +
              `\n**Inputs (${txData.inputs.length}):**` +
              inputsText +
              `\n**Outputs (${txData.outputs.length}):**` +
              outputsText +
              spellText +
              `\n🌐 **View on Explorer:**\nhttps://mempool.space/testnet4/tx/${txData.txid}`,
          })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
          await interaction.editReply({
            content: `❌ **Failed to Fetch Transaction Raw Data**\n\n${errorMessage}`,
          })
        }
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
