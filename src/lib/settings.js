/**
 * Per-server settings + the schema the web panel uses to render its form.
 */
const { settings: store } = require('./db');
const { tierOf } = require('./premium');

const SCHEMA = [
    { key: 'djRoleId', type: 'role', label: 'DJ role', help: 'Only members with this role (or Manage Server) can skip, stop and change the queue. Empty = everyone.' },
    { key: 'defaultVolume', type: 'number', label: 'Default volume', min: 1, max: 200, help: 'Volume used when the bot joins. Above 100 needs Premium.' },
    { key: 'announceTracks', type: 'boolean', label: 'Announce each track', help: 'Send a now-playing card with controls when a song starts.' },
    { key: 'voteSkip', type: 'boolean', label: 'Vote to skip', help: 'Non-DJs need half of the listeners to agree before a skip.' },
    { key: 'autoLeave', type: 'boolean', label: 'Leave when alone', help: 'Disconnect two minutes after everyone leaves the voice channel.' },
    { key: 'alwaysOn', type: 'boolean', label: '24/7 mode', premium: true, help: 'Stay in the voice channel even when the queue ends.' },
    { key: 'autoplay', type: 'boolean', label: 'Autoplay radio', premium: true, help: 'When the queue ends, keep the vibe going with the server’s favourite station.' },
    { key: 'defaultFilter', type: 'select', label: 'Default filter', premium: true, options: 'filters', help: 'Audio effect applied to every new track.' },
    { key: 'favouriteStation', type: 'select', label: 'Favourite station', options: 'stations', help: 'Used by /radio with no station and by autoplay.' }
];

const defaults = () => ({
    djRoleId: null,
    defaultVolume: 80,
    announceTracks: true,
    voteSkip: false,
    autoLeave: true,
    alwaysOn: false,
    autoplay: false,
    defaultFilter: 'off',
    favouriteStation: null
});

function get(guildId) {
    if (!store.data[guildId]) store.data[guildId] = defaults();
    return { ...defaults(), ...store.data[guildId] };
}

/**
 * Validates a patch against SCHEMA and the server's tier.
 * Throws an Error with a user-friendly message when something is invalid.
 */
function validate(guildId, patch, { filters = [], stations = [] } = {}) {
    const tier = tierOf(guildId);
    const clean = {};
    for (const [key, value] of Object.entries(patch || {})) {
        const field = SCHEMA.find(f => f.key === key);
        if (!field) throw new Error(`Unknown setting "${key}"`);
        const enabling = value !== null && value !== false && value !== 'off';
        if (field.premium && enabling && tier.rank === 0) throw new Error(`${field.label} is a Premium feature.`);
        switch (field.type) {
            case 'boolean':
                if (typeof value !== 'boolean') throw new Error(`${field.label} must be on or off.`);
                break;
            case 'number': {
                const n = Number(value);
                if (!Number.isInteger(n) || n < field.min || n > field.max) throw new Error(`${field.label} must be ${field.min}-${field.max}.`);
                if (n > tier.maxVolume) throw new Error(`${tier.name} allows volume up to ${tier.maxVolume}.`);
                clean[key] = n;
                continue;
            }
            case 'role':
                if (value !== null && !/^\d{17,20}$/.test(String(value))) throw new Error(`${field.label} must be a role.`);
                break;
            case 'select': {
                const allowed = field.options === 'filters' ? filters : stations;
                if (value !== null && !allowed.includes(value)) throw new Error(`${field.label}: unknown option.`);
                break;
            }
        }
        clean[key] = value;
    }
    return clean;
}

function update(guildId, patch, ctx) {
    const clean = validate(guildId, patch, ctx);
    store.data[guildId] = { ...get(guildId), ...clean };
    store.save();
    return get(guildId);
}

module.exports = { SCHEMA, defaults, get, update, validate };
