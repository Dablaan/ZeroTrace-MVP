export const runtime = "nodejs"; // MUST use Node.js runtime for TCP/TLS sockets

import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";

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

interface ClanRemitente {
    email: string;
    count: number;
    uids: number[];
    sizeBytes: number;
}

interface PuebloFantasma {
    email: string;
    subject: string;
    date: string;
    uid: number;
    sizeBytes: number;
}

interface HubDesuscripcion {
    name: string;
    email: string;
    unsubscribeUrl: string;
    uids: number[];
    sizeBytes: number;
}

// Función auxiliara para procesar raw headers manualmente y optimizar CPU
function extractHeader(headerText: string, key: string): string {
    const lines = headerText.split(/\r?\n/);
    let value = '';
    let inHeader = false;
    for (const line of lines) {
        if (line.toLowerCase().startsWith(key.toLowerCase() + ':')) {
            value = line.substring(key.length + 1).trim();
            inHeader = true;
        } else if (inHeader && (line.startsWith(' ') || line.startsWith('\t'))) {
            value += ' ' + line.trim();
        } else if (inHeader) {
            inHeader = false;
        }
    }
    return value;
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
            logger: false // Zero Logs
        });

        await client.connect();
        const lock = await client.getMailboxLock('INBOX');

        const remitentesMap = new Map<string, { count: number, uids: number[], sizeBytes: number }>();
        const pueblosFantasmasMap = new Map<number, PuebloFantasma>();
        const hubDesuscripcionMap = new Map<string, HubDesuscripcion>();

        // Lógica de fechas (Comparativa con el año "actual" 2024 demandado)
        const currentYear = 2024;
        const nowMocked = new Date();
        nowMocked.setFullYear(currentYear);
        const twoYearsAgo = new Date(nowMocked);
        twoYearsAgo.setFullYear(currentYear - 2); // Efectivamente 2022 o anterior

        try {
            const totalMessages = typeof client.mailbox !== 'boolean' ? client.mailbox.exists : 0;
            if (totalMessages === 0) {
                return NextResponse.json({ clan: [], pueblos: [], hub: [] });
            }

            // Escalar el escaneo a los últimos 2000 correos (optimización para Vercel Serverless)
            const fetchStart = Math.max(1, totalMessages - 1999);
            const fetchRange = `${fetchStart}:${totalMessages}`;

            // client.fetch pide ÚNICAMENTE los headers necesarios, OMITIENDO el cuerpo explícitamente y el parseo del envelope
            for await (const message of client.fetch(fetchRange, {
                headers: ['from', 'subject', 'date', 'list-unsubscribe'],
                size: true
            })) {
                const uid = message.uid;

                let headersStr = '';
                if (message.headers && message.headers instanceof Buffer) {
                    headersStr = message.headers.toString('utf-8');
                } else if (message.headers && typeof message.headers === 'object') {
                    try { headersStr = JSON.stringify(message.headers); } catch (e) { }
                }

                if (!headersStr) continue;

                const fromHeader = extractHeader(headersStr, 'from');
                const subjectHeader = extractHeader(headersStr, 'subject') || "(Sin asunto)";
                const dateHeader = extractHeader(headersStr, 'date');
                const listUnsubscribeHeader = extractHeader(headersStr, 'list-unsubscribe');

                if (!fromHeader) continue;

                const emailMatch = fromHeader.match(/<([^>]+)>/);
                const fromEmail = emailMatch ? emailMatch[1].toLowerCase() : fromHeader.toLowerCase().trim();
                const senderName = fromHeader.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || fromEmail.split('@')[0];

                const msgSize = message.size || 0;

                // 1. CLAN: Agrupar por remitente
                if (fromEmail) {
                    const current = remitentesMap.get(fromEmail) || { count: 0, uids: [], sizeBytes: 0 };
                    current.count += 1;
                    current.uids.push(uid);
                    current.sizeBytes += msgSize;
                    remitentesMap.set(fromEmail, current);
                }

                // 2. PUEBLOS FANTASMAS: Identificar correos de más de 2 años (Previos a 2022)
                let msgDate = new Date(dateHeader);
                if (!isNaN(msgDate.getTime()) && msgDate < twoYearsAgo) {
                    pueblosFantasmasMap.set(uid, {
                        email: fromEmail,
                        subject: subjectHeader,
                        date: msgDate.toISOString(),
                        uid: uid,
                        sizeBytes: msgSize
                    });
                }

                // 3. HUB: Identificar Newsletters comerciales
                if (listUnsubscribeHeader) {
                    const currentHub = hubDesuscripcionMap.get(fromEmail) || {
                        name: senderName,
                        email: fromEmail,
                        unsubscribeUrl: listUnsubscribeHeader,
                        uids: [],
                        sizeBytes: 0
                    };
                    currentHub.uids.push(uid);
                    currentHub.sizeBytes += msgSize;
                    hubDesuscripcionMap.set(fromEmail, currentHub);
                }
            }
        } finally {
            lock.release();
        }

        await client.logout();
        client = null;

        // Limpiar Maps de O(N) a Arrays para el cliente
        const clanArray: ClanRemitente[] = Array.from(remitentesMap.entries())
            .filter(([_, data]) => data.count > 2)
            .map(([email, data]) => ({ email, count: data.count, uids: data.uids, sizeBytes: data.sizeBytes }))
            .sort((a, b) => b.count - a.count);

        const pueblosArray: PuebloFantasma[] = Array.from(pueblosFantasmasMap.values())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const hubArray: HubDesuscripcion[] = Array.from(hubDesuscripcionMap.values());

        return NextResponse.json({ clan: clanArray, pueblos: pueblosArray, hub: hubArray });

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
