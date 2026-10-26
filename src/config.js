require('dotenv').config();
const brand = require('../bot.config');

const list = v => (v || '').split(',').map(s => s.trim()).filter(Boolean);

module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID || null,
    ownerIds: list(process.env.OWNER_IDS),
    soundcloudClientId: process.env.SOUNDCLOUD_CLIENT_ID || null,
    panel: {
        port: Number(process.env.PANEL_API_PORT) || 0, // 0 = disabled
        origin: process.env.PANEL_ORIGIN || 'https://krishyaa06.github.io'
    },
    links: {
        ...brand.links,
        buy: process.env.PREMIUM_BUY_URL || brand.links.buy
    },
    brand
};
