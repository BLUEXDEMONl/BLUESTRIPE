import { default as makeWASocket, DisconnectReason, useSingleFileAuthState } from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import fs from "fs"
import path from "path"

const pluginsFolder = "./plugins"

// Load plugins
const loadPlugins = () => {
  const plugins = {}
  const files = fs.readdirSync(pluginsFolder)
  for (const file of files) {
    if (file.endsWith(".js")) {
      const plugin = import(path.join(process.cwd(), pluginsFolder, file))
      plugins[file.slice(0, -3)] = plugin
    }
  }
  return plugins
}

const plugins = loadPlugins()

async function connectToWhatsApp() {
  const { state, saveCreds } = await useSingleFileAuthState("auth_info_baileys")

  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
  })

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error instanceof Boom && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
      console.log("connection closed due to ", lastDisconnect.error, ", reconnecting ", shouldReconnect)
      if (shouldReconnect) {
        connectToWhatsApp()
      }
    } else if (connection === "open") {
      console.log("opened connection")
    }
  })

  sock.ev.on("messages.upsert", async (m) => {
    console.log(JSON.stringify(m, undefined, 2))

    const msg = m.messages[0]
    if (!msg.key.fromMe && m.type === "notify") {
      const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

      // Check if the message is a command
      if (messageText.startsWith("!")) {
        const [command, ...args] = messageText.slice(1).split(" ")
        if (plugins[command]) {
          try {
            await plugins[command].execute(sock, msg, args)
          } catch (error) {
            console.error(`Error executing command ${command}:`, error)
            await sock.sendMessage(msg.key.remoteJid, { text: "An error occurred while processing your command." })
          }
        } else {
          await sock.sendMessage(msg.key.remoteJid, { text: "Unknown command. Type !help for a list of commands." })
        }
      }
    }
  })

  sock.ev.on("creds.update", saveCreds)
}

connectToWhatsApp()

