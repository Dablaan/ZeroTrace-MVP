export const runtime = "nodejs"; // MUST use Node.js runtime for TCP/TLS sockets

import { NextResponse } from "next/server";
import { ImapFlow } from "imapflow";

export async function POST(request: Request) {
    let client: ImapFlow | null = null;

    try {
        const { email, appPassword, imapHost, imapPort, uids } = await request.json();

        if (!email || !appPassword || !imapHost || !imapPort || !Array.isArray(uids) || uids.length === 0) {
            return NextResponse.json(
                { error: "Email, App Password, servidor IMAP y una lista de Correos a borrar requeridos" },
                { status: 400 }
            );
        }

        client = new ImapFlow({
            host: imapHost,
            port: imapPort,
            secure: true,
            auth: { user: email, pass: appPassword },
            logger: false // Zero Logs
        });

        await client.connect();

        // 1. Detectar el nombre exacto de la Papelera
        let trashPath: string | null = null;
        const folders = await client.list();
        for (const folder of folders) {
            if (folder.flags.has('\\Trash')) {
                trashPath = folder.path;
                break;
            }
        }

        // Fallback a "Trash" si el flag \Trash no está disponible explícitamente
        if (!trashPath) {
            trashPath = email.includes('gmail.com') ? '[Gmail]/Papelera' : 'Trash';
        }

        // 2. Mover los correos al Trash usando UID
        const lock = await client.getMailboxLock('INBOX');
        try {
            // IMAPFlow permite mover pasando los UIDs como String CSV (ej: "123,124,125")
            // o como array de números. Por seguridad, lo pasamos como String para prevenir fallos en arrays grandes de UIDs.
            const uidSequence = uids.join(',');

            // `messageMove` requiere el flag { uid: true } habilitado para usar secuencias de UID
            await client.messageMove(uidSequence, trashPath, { uid: true });

        } finally {
            lock.release();
        }

        await client.logout();
        client = null;

        return NextResponse.json({ success: true, count: uids.length });

    } catch (error: unknown) {
        if (client) {
            client.close();
            client = null;
        }

        const errMessage = error instanceof Error ? error.message : String(error);
        if (errMessage.toLowerCase().includes('authentication') || errMessage.toLowerCase().includes('login failed')) {
            return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
        }

        return NextResponse.json({ error: errMessage }, { status: 500 });
    }
}
