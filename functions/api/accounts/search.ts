export const onRequestGet: PagesFunction<Env> = async (context) => {
    const url = new URL(context.request.url);
    const query = url.searchParams.get('q')?.trim() || '';

    const db = context.env.DB;

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

    return new Response(JSON.stringify({ results: mapped }), {
        headers: { 'Content-Type': 'application/json' },
    });
};
