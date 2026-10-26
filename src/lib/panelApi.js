/**
 * Prism Panel API: a tiny, dependency-free HTTP server that lets the web panel
 * (https://krishyaa06.github.io/prism-bots-panel) show live stats and edit
 * server settings.
 *
 * Auth: the panel logs users in with Discord OAuth2 and sends the user's access
 * token as "Authorization: Bearer <token>". We ask Discord which servers that
 * user can manage, so nobody can change a server they do not administer.
 * The bot token never leaves this process.
 */
const http = require('node:http');
const crypto = require('node:crypto');
const log = require('./logger');

const MANAGE_GUILD = 1n << 5n;
const ADMINISTRATOR = 1n << 3n;
const DISCORD = 'https://discord.com/api/v10';

const sessionCache = new Map(); // sha256(token) -> { user, guilds, at }
const hits = new Map(); // ip -> { n, reset }

async function discordUser(token) {
    const k = crypto.createHash('sha256').update(token).digest('hex');
    const cached = sessionCache.get(k);
    if (cached && Date.now() - cached.at < 60_000) return cached;
    const headers = { Authorization: `Bearer ${token}` };
    const [u, g] = await Promise.all([fetch(`${DISCORD}/users/@me`, { headers }), fetch(`${DISCORD}/users/@me/guilds`, { headers })]);
    if (!u.ok || !g.ok) throw Object.assign(new Error('Discord login expired. Please log in again.'), { status: 401 });
    const session = { user: await u.json(), guilds: await g.json(), at: Date.now() };
    sessionCache.set(k, session);
    if (sessionCache.size > 5000) sessionCache.delete(sessionCache.keys().next().value);
    return session;
}

const canManage = g => g.owner || (BigInt(g.permissions) & (MANAGE_GUILD | ADMINISTRATOR)) !== 0n;

function send(res, status, body, origin) {
    res.writeHead(status, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS',
        'Cache-Control': 'no-store'
    });
    res.end(status === 204 ? undefined : JSON.stringify(body));
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', c => {
            data += c;
            if (data.length > 16_384) { reject(Object.assign(new Error('Body too large'), { status: 413 })); req.destroy(); }
        });
        req.on('end', () => {
            try { resolve(data ? JSON.parse(data) : {}); } catch { reject(Object.assign(new Error('Invalid JSON'), { status: 400 })); }
        });
    });
}

function limited(ip) {
    const now = Date.now();
    const h = hits.get(ip) || { n: 0, reset: now + 60_000 };
    if (now > h.reset) { h.n = 0; h.reset = now + 60_000; }
    h.n++;
    hits.set(ip, h);
    return h.n > 120;
}

/**
 * @param {import('discord.js').Client} client
 * @param {{port:number, origin:string}} opts
 * @param {object} adapter  bot-specific hooks (see panelAdapter.js)
 */
function start(client, opts, adapter) {
    const origin = opts.origin || '*';

    async function authGuild(req, guildId) {
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        if (!token) throw Object.assign(new Error('Log in with Discord first.'), { status: 401 });
        const session = await discordUser(token);
        const g = session.guilds.find(x => x.id === guildId);
        if (!g || !canManage(g)) throw Object.assign(new Error('You need Manage Server in that server.'), { status: 403 });
        const guild = client.guilds.cache.get(guildId);
        if (!guild) throw Object.assign(new Error('The bot is not in that server yet.'), { status: 404 });
        return { session, guild };
    }

    const server = http.createServer(async (req, res) => {
        if (req.method === 'OPTIONS') return send(res, 204, null, origin);
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
        if (limited(ip)) return send(res, 429, { error: 'Too many requests' }, origin);

        const url = new URL(req.url, 'http://localhost');
        const parts = url.pathname.split('/').filter(Boolean); // ["api", ...]
        try {
            if (parts[0] !== 'api') return send(res, 404, { error: 'Not found' }, origin);

            // GET /api/status — public
            if (parts[1] === 'status' && req.method === 'GET') {
                return send(res, 200, {
                    bot: adapter.botId,
                    online: client.isReady(),
                    tag: client.user?.tag,
                    avatar: client.user?.displayAvatarURL({ size: 256 }),
                    servers: client.guilds.cache.size,
                    members: client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0),
                    ping: Math.round(client.ws.ping),
                    uptime: Math.round(process.uptime()),
                    version: adapter.version,
                    commands: adapter.commands(),
                    ...(adapter.publicStats ? adapter.publicStats() : {})
                }, origin);
            }

            // GET /api/me/guilds — servers the user can manage
            if (parts[1] === 'me' && parts[2] === 'guilds' && req.method === 'GET') {
                const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
                if (!token) return send(res, 401, { error: 'Log in with Discord first.' }, origin);
                const session = await discordUser(token);
                const guilds = session.guilds.filter(canManage).map(g => ({
                    id: g.id, name: g.name, icon: g.icon, botIn: client.guilds.cache.has(g.id),
                    ...(client.guilds.cache.has(g.id) && adapter.guildBadge ? adapter.guildBadge(g.id) : {})
                }));
                return send(res, 200, { user: { id: session.user.id, username: session.user.username, avatar: session.user.avatar }, guilds }, origin);
            }

            // /api/guilds/:id[...]
            if (parts[1] === 'guilds' && /^\d{17,20}$/.test(parts[2] || '')) {
                const { session, guild } = await authGuild(req, parts[2]);

                if (!parts[3] && req.method === 'GET') {
                    const channels = guild.channels.cache
                        .filter(c => c.isTextBased() && !c.isThread() && !c.isVoiceBased())
                        .sort((a, b) => a.rawPosition - b.rawPosition)
                        .map(c => ({ id: c.id, name: c.name }));
                    const roles = guild.roles.cache
                        .filter(r => r.id !== guild.id && !r.managed)
                        .sort((a, b) => b.position - a.position)
                        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));
                    const categories = guild.channels.cache
                        .filter(c => c.type === 4) // GuildCategory
                        .sort((a, b) => a.rawPosition - b.rawPosition)
                        .map(c => ({ id: c.id, name: c.name }));
                    return send(res, 200, {
                        guild: { id: guild.id, name: guild.name, icon: guild.iconURL({ size: 128 }), members: guild.memberCount },
                        channels, roles, categories,
                        schema: adapter.schema,
                        options: adapter.options ? adapter.options() : {},
                        settings: adapter.getSettings(guild.id),
                        extra: adapter.guildExtra ? adapter.guildExtra(guild.id, client) : {}
                    }, origin);
                }

                if (parts[3] === 'settings' && req.method === 'PATCH') {
                    const patch = await readBody(req);
                    try {
                        const settings = adapter.updateSettings(guild.id, patch);
                        log.info(`[panel] ${session.user.username} updated settings in ${guild.name}`);
                        return send(res, 200, { settings }, origin);
                    } catch (err) {
                        return send(res, 400, { error: err.message }, origin);
                    }
                }

                if (parts[3] === 'actions' && parts[4] && req.method === 'POST') {
                    const action = adapter.actions?.[parts[4]];
                    if (!action) return send(res, 404, { error: 'Unknown action' }, origin);
                    const body = await readBody(req);
                    const result = await action({ guild, client, body, user: session.user });
                    return send(res, result.ok === false ? 400 : 200, result, origin);
                }
            }
            return send(res, 404, { error: 'Not found' }, origin);
        } catch (err) {
            if (!err.status) log.error('[panel]', err);
            return send(res, err.status || 500, { error: err.status ? err.message : 'Internal error' }, origin);
        }
    });

    server.listen(opts.port, () => log.ok(`Panel API on :${opts.port} (CORS: ${origin})`));
    return server;
}

module.exports = { start, canManage };
