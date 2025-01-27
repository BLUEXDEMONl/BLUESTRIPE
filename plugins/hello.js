export const execute = async (sock, msg, args) => {
  const replyText = args.length > 0 ? `Hello, ${args.join(" ")}!` : "Hello there!"
  await sock.sendMessage(msg.key.remoteJid, { text: replyText })
}
