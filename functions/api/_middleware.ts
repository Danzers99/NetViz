export const onRequest: PagesFunction<Env> = async (context) => {
    const token = context.env.ACCOUNTS_API_TOKEN;
    const authHeader = context.request.headers.get('Authorization');

    if (token && (!authHeader || authHeader !== `Bearer ${token}`)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return context.next();
};
