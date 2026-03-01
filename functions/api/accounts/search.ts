export const onRequestGet: PagesFunction<Env> = async (context) => {
    const requestId = (context as any).requestId || '?';

    try {
        const db = context.env.DB;
        if (!db) {
            console.error(`[${requestId}] D1 binding 'DB' is not available. Check Pages > Settings > Functions > D1 database bindings.`);
            return Response.json(
                { ok: false, code: 'DB_NOT_CONFIGURED', message: 'Database not configured. Contact admin.', requestId },
                { status: 503 }
            );
        }

        const url = new URL(context.request.url);
        const query = url.searchParams.get('q')?.trim() || '';

        let results;
        if (query) {
            const pattern = `%${query}%`;
            results = await db
                .prepare(
                    `SELECT cake_id, name, device_count, last_edited, last_edited_by
                     FROM accounts
                     WHERE name LIKE ?1 OR cake_id LIKE ?1
                     ORDER BY last_edited DESC
                     LIMIT 50`
                )
                .bind(pattern)
                .all();
        } else {
            results = await db
                .prepare(
                    `SELECT cake_id, name, device_count, last_edited, last_edited_by
                     FROM accounts
                     ORDER BY last_edited DESC
                     LIMIT 50`
                )
                .all();
        }

        const mapped = (results.results || []).map((row: any) => ({
            cakeId: row.cake_id,
            name: row.name,
            deviceCount: row.device_count,
            lastEdited: row.last_edited,
            lastEditedBy: row.last_edited_by,
        }));

        console.log(`[${requestId}] Search q="${query}" returned ${mapped.length} results`);
        return Response.json({ ok: true, results: mapped });
    } catch (err: any) {
        console.error(`[${requestId}] SEARCH ERROR:`, err?.stack || err?.message || err);
        return Response.json(
            { ok: false, code: 'SEARCH_FAILED', message: err?.message || 'Search failed', requestId },
            { status: 500 }
        );
    }
};
