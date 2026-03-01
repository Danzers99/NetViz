export const onRequestGet: PagesFunction<Env> = async (context) => {
    const cakeId = context.params.cakeId as string;
    const db = context.env.DB;

    const row = await db
        .prepare('SELECT cake_id, name, config_json FROM accounts WHERE cake_id = ?')
        .bind(cakeId)
        .first();

    if (!row) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response(
        JSON.stringify({
            cakeId: row.cake_id,
            name: row.name,
            config: JSON.parse(row.config_json as string),
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
    const cakeId = context.params.cakeId as string;
    const db = context.env.DB;

    let body: any;
    try {
        body = await context.request.json();
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const config = body?.config;
    if (!config || !config.devices || !config.projectInfo) {
        return new Response(JSON.stringify({ error: 'Missing or invalid config data' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const name = config.projectInfo?.name || 'Untitled Location';
    const deviceCount = Array.isArray(config.devices) ? config.devices.length : 0;
    const lastEdited = new Date().toISOString();
    const lastEditedBy = config.settings?.userName || 'Unknown';
    const configJson = JSON.stringify(config);

    await db
        .prepare(
            `INSERT OR REPLACE INTO accounts (cake_id, name, device_count, last_edited, last_edited_by, config_json, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, COALESCE((SELECT created_at FROM accounts WHERE cake_id = ?1), datetime('now')))`
        )
        .bind(cakeId, name, deviceCount, lastEdited, lastEditedBy, configJson)
        .run();

    return new Response(JSON.stringify({ success: true, cakeId }), {
        headers: { 'Content-Type': 'application/json' },
    });
};
