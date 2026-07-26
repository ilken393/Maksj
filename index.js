const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, delay } = require('vialeys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const { handler } = require('./handler/message');

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ['Altra Assixtenc', 'Safari', '3.0'],
        generateHighQualityLinkPreview: true,
        // Anti spam delay untuk API WhatsApp
        getMessage: async (key) => {
            return { conversation: 'Altra Assixtenc' };
        }
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus anjir, reconnecting...', shouldReconnect);
            if(shouldReconnect) connectToWhatsApp();
        } else if(connection === 'open') {
            console.log('Yeay! Altra udah online 💗🌷');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m) => {
        if(m.type !== 'notify') return;
        const msg = m.messages[0];
        if(!msg.message || msg.key.fromMe) return;

        // Delay anti-spam / anti-banned (1.5 detik per proses chat)
        await delay(1500); 
        
        handler(sock, msg);
    });
}

connectToWhatsApp();
