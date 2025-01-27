const { default: makeWASocket, DisconnectReason, useSingleFileAuthState } = require('@whiskeysockets/baileys');
const { state, saveState } = useSingleFileAuthState('./auth_info.json');

async function startBot() {
    const sock = makeWASocket({ auth: state, printQRInTerminal: true });
    sock.ev.on('creds.update', saveState);
    sock.ev.on('connection.update', (update) => {
        if (update.connection === 'close' && (update.lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
        else if (update.connection === 'open') console.log('Bot connected');
    });
    sock.ev.on('messages.upsert', async (msg) => {
        const message = msg.messages[0];
        if (!message.message || message.key.fromMe) return;
        const text = message.message.conversation || message.message.extendedTextMessage?.text;
        const sender = message.key.remoteJid;
        if (text.toLowerCase() === 'hi') await sock.sendMessage(sender, { text: 'Hello!' });
        if (text.toLowerCase() === 'ping') await sock.sendMessage(sender, { text: 'Pong!' });
    });
}

startBot();