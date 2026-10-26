/**
 * Resolves what a user typed into playable tracks.
 *   - SoundCloud search / track / playlist links (via play-dl)
 *   - Direct audio files & internet radio streams (http/https, public hosts only)
 *   - Built-in radio stations from bot.config.js
 * YouTube and Spotify are intentionally not supported (their terms forbid it).
 */
const path = require('node:path');
const play = require('play-dl');
const { assertPublicUrl } = require('./urlGuard');
const brand = require('../../bot.config');
const log = require('./logger');

let soundcloudReady = false;

async function initSoundCloud(clientId) {
    try {
        const id = clientId || await play.getFreeClientID();
        await play.setToken({ soundcloud: { client_id: id } });
        soundcloudReady = true;
        log.ok('SoundCloud search ready');
    } catch (err) {
        log.warn('SoundCloud unavailable, only links and radio will work:', err.message);
    }
}

const STATIONS = brand.stations;
const stationIds = () => STATIONS.map(s => s.id);

function stationTrack(station, user) {
    return {
        title: station.name, author: station.genre, url: station.url, source: 'radio',
        duration: 0, live: true, thumbnail: null, requestedBy: user, stationId: station.id
    };
}

const fromSoundCloud = (t, user) => ({
    title: t.name, author: t.user?.name || 'SoundCloud', url: t.url, source: 'soundcloud',
    duration: Math.round((t.durationInMs || 0) / 1000), live: false,
    thumbnail: t.thumbnail || null, requestedBy: user
});

const BLOCKED = /(youtube\.com|youtu\.be|music\.youtube|spotify\.com|deezer\.com|music\.apple\.com)/i;

/** @returns {Promise<{tracks: object[], playlist?: string}>} */
async function resolve(query, user) {
    query = String(query || '').trim();
    if (!query) throw new Error('Tell me what to play.');

    const station = STATIONS.find(s => s.id === query.toLowerCase() || s.name.toLowerCase() === query.toLowerCase());
    if (station) return { tracks: [stationTrack(station, user)] };

    if (/^https?:\/\//i.test(query)) {
        if (BLOCKED.test(query)) {
            throw new Error('YouTube / Spotify links are not supported. Try a song name (SoundCloud search), a SoundCloud link, a direct audio link or `/radio`.');
        }
        if (/soundcloud\.com/i.test(query)) {
            if (!soundcloudReady) throw new Error('SoundCloud is unavailable right now.');
            const info = await play.soundcloud(query);
            if (info.type === 'playlist') {
                const all = await info.all_tracks();
                return { tracks: all.map(t => fromSoundCloud(t, user)), playlist: info.name };
            }
            return { tracks: [fromSoundCloud(info, user)] };
        }
        const url = await assertPublicUrl(query);
        const name = decodeURIComponent(path.basename(url.pathname)) || url.hostname;
        return {
            tracks: [{
                title: name.replace(/\.(mp3|ogg|opus|wav|flac|m4a|aac)$/i, '') || url.hostname,
                author: url.hostname, url: url.href, source: 'direct',
                duration: 0, live: false, thumbnail: null, requestedBy: user
            }]
        };
    }

    if (!soundcloudReady) throw new Error('Search is unavailable right now. Use a direct link or `/radio`.');
    const results = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 1 });
    if (!results.length) throw new Error(`No results for **${query}**.`);
    return { tracks: [fromSoundCloud(results[0], user)] };
}

/** Autocomplete suggestions for /play. */
async function suggest(query) {
    if (!query || query.length < 2 || /^https?:/i.test(query) || !soundcloudReady) {
        return STATIONS.slice(0, 5).map(s => ({ name: `📻 ${s.name} · ${s.genre}`, value: s.id }));
    }
    const results = await play.search(query, { source: { soundcloud: 'tracks' }, limit: 6 }).catch(() => []);
    return results.map(t => ({ name: `${t.name} · ${t.user?.name || ''}`.slice(0, 100), value: t.url.slice(0, 100) }));
}

/** Returns the FFmpeg input: a URL string or a readable stream. */
async function input(track) {
    if (track.source === 'soundcloud') {
        const s = await play.stream(track.url);
        return s.stream;
    }
    return track.url;
}

module.exports = { initSoundCloud, resolve, suggest, input, STATIONS, stationIds, stationTrack };
