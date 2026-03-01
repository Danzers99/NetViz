export const onRequest: PagesFunction<Env> = async (context) => {
    const requestId = crypto.randomUUID().slice(0, 8);

    try {
        const token = context.env.ACCOUNTS_API_TOKEN;
        const authHeader = context.request.headers.get('Authorization');

        if (token && (!authHeader || authHeader !== `Bearer ${token}`)) {
            console.log(`[${requestId}] AUTH REJECTED ${context.request.method} ${context.request.url}`);
            return Response.json(
                { ok: false, code: 'UNAUTHORIZED', message: 'Invalid or missing API token' },
                { status: 401 }
            );
        }

        // Inject requestId for downstream handlers
        (context as any).requestId = requestId;

        console.log(`[${requestId}] ${context.request.method} ${new URL(context.request.url).pathname}`);
        const response = await context.next();
        return response;
    } catch (err: any) {
        console.error(`[${requestId}] UNHANDLED MIDDLEWARE ERROR:`, err?.stack || err?.message || err);
        return Response.json(
            { ok: false, code: 'INTERNAL_ERROR', message: 'Internal server error', requestId },
            { status: 500 }
        );
    }
};
