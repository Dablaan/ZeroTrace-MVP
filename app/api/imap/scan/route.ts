export const runtime = "nodejs"; // MUST use Node.js runtime for TCP/TLS sockets

import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";

// Definir la misma función helper de conexión para ZeroTrace
function getImapConfig(email: string) {
    const domain = email.split('@')[1]?.toLowerCase();
    switch (domain) {
        case 'gmail.com': return { host: 'imap.gmail.com', port: 993 };
        case 'outlook.com':
        case 'hotmail.com': return { host: 'outlook.office365.com', port: 993 };
        case 'yahoo.com': return { host: 'imap.mail.yahoo.com', port: 993 };
        default: throw new Error('Dominio de correo no soportado por ahora.');
    }
}

// Interfaces para tipar la respuesta en memoria (Stateless)
interface ClanRemitente {
    email: string;
    count: number;
    uids: number[];
}

interface PuebloFantasma {
    email: string;
    subject: string;
    date: string;
    uid: number;
}

interface HubDesuscripcion {
    name: string;
    email: string;
    unsubscribeUrl: string;
    uid: number;
}

export async function POST(request: Request) {
    let client: ImapFlow | null = null;

    try {
        const { email, appPassword } = await request.json();

        if (!email || !appPassword) {
            return NextResponse.json({ error: "Email y App Password requeridos" }, { status: 400 });
        }

        const config = getImapConfig(email);
        client = new ImapFlow({
            host: config.host,
            port: config.port,
            secure: true,
            auth: { user: email, pass: appPassword },
            logger: false // Garantizar Zero Logs
        });

        await client.connect();

        // Bloquear INBOX para procesar
        const lock = await client.getMailboxLock('INBOX');

        // ALGORITMO ZERO-DATA EN MEMORIA
        const remitentesMap = new Map<string, { count: number, uids: number[] }>();
        const pueblosFantasmasMap = new Map<number, PuebloFantasma>();
        const hubDesuscripcionMap = new Map<number, HubDesuscripcion>();

        const now = new Date();
        const twoYearsAgo = new Date(now.setFullYear(now.getFullYear() - 2));

        try {
            const totalMessages = client.mailbox.exists;
            if (totalMessages === 0) {
                return NextResponse.json({ clan: [], pueblos: [], hub: [] });
            }

            // Escanear los últimos 500 correos (o todos si hay menos)
            const fetchStart = Math.max(1, totalMessages - 499);
            const fetchRange = `${fetchStart}:${totalMessages}`;

            // client.fetch es un AsyncGenerator
            for await (const message of client.fetch(fetchRange, {
                envelope: true,
                internalDate: true,
                headers: ['list-unsubscribe']
            })) {
                const uid = message.uid;
                // Manejar tanto array como objeto dependiendo del parser
                const fromAddressArray = message.envelope.from;
                if (!fromAddressArray || fromAddressArray.length === 0) continue;

                const fromEmail = fromAddressArray[0].address || '';
                const senderName = fromAddressArray[0].name || fromEmail.split('@')[0];
                const msgDate = new Date(message.internalDate);
                const subject = message.envelope.subject || "(Sin asunto)";

                // 1. Agrupar por remitente (CLAN)
                if (fromEmail) {
                    const current = remitentesMap.get(fromEmail) || { count: 0, uids: [] };
                    current.count += 1;
                    current.uids.push(uid);
                    remitentesMap.set(fromEmail, current);
                }

                // 2. Identificar Pueblos Fantasma (Misma lógica: sin guardar en DB, solo en RAM para retornar)
                if (msgDate < twoYearsAgo) {
                    pueblosFantasmasMap.set(uid, {
                        email: fromEmail,
                        subject: subject,
                        date: msgDate.toISOString(),
                        uid: uid
                    });
                }

                // 3. Identificar Newsletters (HUB)
                // Note: headers could be raw buffers or objects. Imapflow typically parses specific requests.
                let unsubscribeHeader = '';
                if (message.headers && message.headers instanceof Buffer) {
                    unsubscribeHeader = message.headers.toString('utf-8');
                } else if (message.headers && typeof message.headers === 'object') {
                    // Si pasamos un array a headers[], ImapFlow devuelve un Buffer, pero si es JSON:
                    // En ImapFlow v1.x se devuelve Buffer for headers request.
                    // Para buscar fácil un string, lo parseamos.
                    try {
                        unsubscribeHeader = JSON.stringify(message.headers);
                    } catch (e) { }
                }

                if (unsubscribeHeader.toLowerCase().includes('list-unsubscribe')) {
                    // Extract URL if exists between < >
                    const urlMatch = unsubscribeHeader.match(/<([^>]+)>/);
                    const url = urlMatch ? urlMatch[1] : '';

                    hubDesuscripcionMap.set(uid, {
                        name: senderName,
                        email: fromEmail,
                        unsubscribeUrl: url,
                        uid: uid
                    });
                }
            }
        } finally {
            lock.release();
        }

        await client.logout();
        client = null;

        // Transform Maps to deduplicated Arrays
        // Clan: Solo remitentes con más de 2 correos para ser considerados "masivos"
        const clanArray: ClanRemitente[] = Array.from(remitentesMap.entries())
            .filter(([_, data]) => data.count > 2)
            .map(([email, data]) => ({
                email,
                count: data.count,
                uids: data.uids
            }))
            .sort((a, b) => b.count - a.count); // Ordenar por volumen

        const pueblosArray: PuebloFantasma[] = Array.from(pueblosFantasmasMap.values());

        // Hub: Deduplicar por email de envío para no saturar la UI con el mismo boletín
        const uniqueHub = new Map<string, HubDesuscripcion>();
        hubDesuscripcionMap.forEach((data) => {
            if (!uniqueHub.has(data.email)) {
                uniqueHub.set(data.email, data);
            }
        });
        const hubArray: HubDesuscripcion[] = Array.from(uniqueHub.values());

        return NextResponse.json({
            clan: clanArray,
            pueblos: pueblosArray,
            hub: hubArray
        });

    } catch (error: any) {
        if (client) {
            client.close();
            client = null;
        }

        const errMessage = error.message || String(error);
        if (errMessage.toLowerCase().includes('authentication') || errMessage.toLowerCase().includes('login failed')) {
            return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
        }

        return NextResponse.json({ error: errMessage }, { status: 500 });
    }
}
