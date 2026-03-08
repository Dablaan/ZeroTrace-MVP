export const runtime = "nodejs"; // MUST use Node.js runtime for TCP/TLS sockets

import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";

function getImapConfig(email: string) {
    const domain = email.split('@')[1]?.toLowerCase();

    switch (domain) {
        case 'gmail.com':
            return { host: 'imap.gmail.com', port: 993 };
        case 'outlook.com':
        case 'hotmail.com':
            return { host: 'outlook.office365.com', port: 993 };
        case 'yahoo.com':
            return { host: 'imap.mail.yahoo.com', port: 993 };
        default:
            throw new Error('Dominio de correo no soportado por ahora. Usa Gmail, Outlook, Hotmail o Yahoo.');
    }
}

export async function POST(request: Request) {
    console.log("-> Endpoint IMAP alcanzado");

    let client: ImapFlow | null = null;

    try {
        const body = await request.json();
        const { email, appPassword } = body;

        console.log("-> Body parsed successfully", { email });

        if (!email || !appPassword) {
            return NextResponse.json({ error: "Email y App Password requeridos" }, { status: 400 });
        }

        const config = getImapConfig(email);

        // Instantiate ImapFlow with silent logger to prevent credential leaks in console
        client = new ImapFlow({
            host: config.host,
            port: config.port,
            secure: true,
            auth: {
                user: email,
                pass: appPassword
            },
            logger: false
        });

        // Try connecting
        await client.connect();
        console.log("-> IMAP Connected successfully");

        // Access INBOX to get total count
        const lock = await client.getMailboxLock('INBOX');
        let totalMessages = 0;
        try {
            totalMessages = typeof client.mailbox !== 'boolean' ? client.mailbox.exists : 0;
            console.log("-> Total INBOX messages:", totalMessages);
        } finally {
            lock.release();
        }

        // Clean logout
        await client.logout();
        client = null;
        console.log("-> IMAP Disconnected cleanly");

        return NextResponse.json({
            status: 'success',
            totalMessages
        });

    } catch (error: unknown) {
        // Ensure client is closed to prevent memory leaks if something failed
        if (client) {
            client.close();
            client = null;
        }

        const errMessage = error instanceof Error ? error.message : String(error);
        console.log("-> Error in IMAP connection:", errMessage);

        // Map authentication failures to 401
        if (errMessage.toLowerCase().includes('authentication failed') || errMessage.toLowerCase().includes('login failed') || errMessage.toLowerCase().includes('logon failed')) {
            return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
        }

        return NextResponse.json({ error: errMessage }, { status: 500 });
    }
}
