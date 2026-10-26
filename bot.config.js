/** Theme + identity for RoyalWave DJ. Everything brand-specific lives here. */
module.exports = {
    id: 'royalwave',
    name: 'RoyalWave DJ',
    short: 'RoyalWave',
    keyPrefix: 'RYW',
    tagline: "Luxury DJ with premium queue and playback controls.",
    footer: 'Prism Protocol',
    colors: { brand: 0xf5c451, success: 0x00ffaa, danger: 0xff3366, premium: 0xffc857 },
    emoji: { brand: '👑', ok: '✅', error: '❌', premium: '💎', radio: '🎷', wave: '≈' },
    bar: { done: '━', head: '◈', todo: '─' },
    statuses: [
        { name: "/play • in style", type: 'Listening' },
        { name: "{servers} royal courts", type: 'Watching' },
        { name: "/radio secretagent 🎷", type: 'Playing' }
    ],
    // Listener-supported radio from SomaFM (https://somafm.com). Please consider supporting them.
    stations: [
        { id: 'secretagent', name: "Secret Agent", genre: "Spy lounge", url: 'https://ice1.somafm.com/secretagent-128-mp3' },
        { id: 'sonicuniverse', name: "Sonic Universe", genre: "Jazz", url: 'https://ice1.somafm.com/sonicuniverse-128-mp3' },
        { id: 'illstreet', name: "Illinois Street Lounge", genre: "Classic lounge", url: 'https://ice1.somafm.com/illstreet-128-mp3' },
        { id: 'bossa', name: "Bossa Beyond", genre: "Bossa nova", url: 'https://ice1.somafm.com/bossa-128-mp3' },
        { id: 'seventies', name: "Left Coast 70s", genre: "70s soft rock", url: 'https://ice1.somafm.com/seventies-128-mp3' }
    ],
    premium: { prices: { premium: '₹99/month', plus: '₹249/month' } },
    links: {
        panel: 'https://krishyaa06.github.io/prism-bots-panel/',
        support: 'https://dc.gg/prismprotocol',
        buy: 'https://krishyaa06.github.io/prism-bots-panel/#/premium/royalwave',
        github: 'https://github.com/krishyaa06/royalwave-dj-bot'
    }
};
