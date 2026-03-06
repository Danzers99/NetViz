export const onRequestGet: PagesFunction<Env> = async (context) => {
    const requestId = (context as any).requestId || '?';
    const cakeId = context.params.cakeId as string;

    try {
        const db = context.env.DB;
        if (!db) {
            console.error(`[${requestId}] D1 binding 'DB' is not available.`);
            return Response.json(
                { ok: false, code: 'DB_NOT_CONFIGURED', message: 'Database not configured. Contact admin.', requestId },
                { status: 503 }
            );
        }

        const row = await db
            .prepare('SELECT cake_id, name, config_json FROM accounts WHERE cake_id = ?')
            .bind(cakeId)
            .first();

        if (!row) {
            return Response.json(
                { ok: false, code: 'NOT_FOUND', message: `No account found for CAKE ID ${cakeId}` },
                { status: 404 }
            );
        }

        console.log(`[${requestId}] Loaded account ${cakeId}`);
        return Response.json({
            ok: true,
            cakeId: row.cake_id,
            name: row.name,
            config: JSON.parse(row.config_json as string),
        });
    } catch (err: any) {
        console.error(`[${requestId}] LOAD ERROR for ${cakeId}:`, err?.stack || err?.message || err);
        return Response.json(
            { ok: false, code: 'LOAD_FAILED', message: err?.message || 'Failed to load account', requestId },
            { status: 500 }
        );
    }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const requestId = (context as any).requestId || '?';
    const cakeId = context.params.cakeId as string;

    try {
        const db = context.env.DB;
        if (!db) {
            console.error(`[${requestId}] D1 binding 'DB' is not available.`);
            return Response.json(
                { ok: false, code: 'DB_NOT_CONFIGURED', message: 'Database not configured. Contact admin.', requestId },
                { status: 503 }
            );
        }

        let body: any;
        try {
            body = await context.request.json();
        } catch {
            return Response.json(
                { ok: false, code: 'INVALID_BODY', message: 'Request body is not valid JSON' },
                { status: 400 }
            );
        }

        const config = body?.config;
        if (!config || !config.devices || !config.projectInfo) {
            return Response.json(
                { ok: false, code: 'INVALID_CONFIG', message: 'Missing or invalid config data (requires devices and projectInfo)' },
                { status: 400 }
            );
        }

        // Allow the request to override name (from the editable dialog)
        const name = body.name || config.projectInfo?.name || 'Untitled Location';
        const deviceCount = Array.isArray(config.devices) ? config.devices.length : 0;
        const lastEdited = new Date().toISOString();
        // Author is sent as explicit save metadata from the frontend (body.lastEditedBy).
        // Fallback chain: body field → latest revision author → legacy config.settings.userName → Unknown
        const revisions = Array.isArray(config.revisions) ? config.revisions : [];
        const latestRevisionAuthor = revisions.length > 0 ? revisions[revisions.length - 1]?.author : null;
        const lastEditedBy = body.lastEditedBy || latestRevisionAuthor || config.settings?.userName || 'Unknown';
        const configJson = JSON.stringify(config);

        await db
            .prepare(
                `INSERT OR REPLACE INTO accounts (cake_id, name, device_count, last_edited, last_edited_by, config_json, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, COALESCE((SELECT created_at FROM accounts WHERE cake_id = ?1), datetime('now')))`
            )
            .bind(cakeId, name, deviceCount, lastEdited, lastEditedBy, configJson)
            .run();

        console.log(`[${requestId}] Saved account ${cakeId} name="${name}" devices=${deviceCount}`);
        return Response.json({ ok: true, cakeId, name });
    } catch (err: any) {
        console.error(`[${requestId}] SAVE ERROR for ${cakeId}:`, err?.stack || err?.message || err);
        return Response.json(
            { ok: false, code: 'SAVE_FAILED', message: err?.message || 'Failed to save account', requestId },
            { status: 500 }
        );
    }
};
