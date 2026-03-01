export const onRequestPost: PagesFunction<Env> = async (context) => {
    const requestId = crypto.randomUUID().slice(0, 8);

    try {
        const body = await context.request.json() as { code?: string };
        const submitted = body?.code || '';
        const expected = context.env.SUPPORT_MODE_CODE || '';

        // If SUPPORT_MODE_CODE is not configured, all attempts fail
        if (!expected) {
            console.log(`[${requestId}] SUPPORT_UNLOCK rejected — SUPPORT_MODE_CODE not configured`);
            return Response.json({ ok: false, message: 'Invalid code' }, { status: 403 });
        }

        // Timing-safe comparison
        const enc = new TextEncoder();
        const a = enc.encode(submitted);
        const b = enc.encode(expected);

        let match = a.byteLength === b.byteLength;
        // Use equal-length buffers for timingSafeEqual (requires same length)
        const padded = match ? a : new Uint8Array(b.byteLength);
        const result = crypto.subtle.timingSafeEqual(padded, b);
        match = match && result;

        const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
        console.log(`[${requestId}] SUPPORT_UNLOCK attempt from=${ip} success=${match}`);

        if (match) {
            return Response.json({ ok: true });
        }
        return Response.json({ ok: false, message: 'Invalid code' }, { status: 403 });
    } catch (err: any) {
        console.error(`[${requestId}] SUPPORT_UNLOCK ERROR:`, err?.message);
        return Response.json({ ok: false, message: 'Server error' }, { status: 500 });
    }
};
