const test = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

process.env.BOT_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bot-test-'));

const { duration, parseTime, progressBar } = require('../src/lib/format');
const { isPrivateIp } = require('../src/lib/urlGuard');
const premium = require('../src/lib/premium');
const settings = require('../src/lib/settings');
const { FILTERS } = require('../src/lib/filters');

test('duration formatting', () => {
    assert.strictEqual(duration(0), '0:00');
    assert.strictEqual(duration(187), '3:07');
    assert.strictEqual(duration(3729), '1:02:09');
    assert.strictEqual(duration(10, true), 'LIVE');
});

test('time parsing', () => {
    assert.strictEqual(parseTime('90'), 90);
    assert.strictEqual(parseTime('1:30'), 90);
    assert.strictEqual(parseTime('1:02:03'), 3723);
    assert.strictEqual(parseTime('2m10s'), 130);
    assert.strictEqual(parseTime('abc'), null);
});

test('progress bar has a single head', () => {
    const bar = progressBar(30, 60, 10);
    assert.strictEqual([...bar].filter(c => c === '●').length, 1);
    assert.strictEqual([...bar].length, 10);
});

test('private networks are blocked', () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.0.10', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1', '::ffff:127.0.0.1']) {
        assert.ok(isPrivateIp(ip), ip);
    }
    for (const ip of ['1.1.1.1', '8.8.8.8', '2606:4700::1111']) assert.ok(!isPrivateIp(ip), ip);
});

test('premium keys: generate, redeem once, stack, expire', () => {
    const g = '111111111111111111';
    assert.strictEqual(premium.tierOf(g).id, 'free');
    const [a, b] = premium.generateKeys({ tier: 'premium', days: 30, count: 2, createdBy: 'owner' });
    assert.match(a, /^[A-Z]{3}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);

    const now = Date.now();
    const r1 = premium.redeem({ code: a.toLowerCase(), guildId: g, userId: 'u', now });
    assert.ok(r1.ok);
    assert.strictEqual(premium.tierOf(g).id, 'premium');
    assert.strictEqual(premium.redeem({ code: a, guildId: g, userId: 'u' }).ok, false, 'key reuse is blocked');

    const r2 = premium.redeem({ code: b, guildId: g, userId: 'u', now });
    assert.strictEqual(r2.expiresAt - r1.expiresAt, 30 * 86_400_000, 'same tier stacks');

    assert.strictEqual(premium.getGuild(g, r2.expiresAt + 1).tier.id, 'free', 'expired falls back to free');
    assert.strictEqual(premium.redeem({ code: 'NOPE-0000', guildId: g, userId: 'u' }).ok, false);
});

test('settings validation respects premium gates', () => {
    const free = '222222222222222222';
    assert.throws(() => settings.update(free, { alwaysOn: true }), /Premium/);
    assert.throws(() => settings.update(free, { defaultVolume: 150 }), /up to 100/);
    assert.throws(() => settings.update(free, { nope: 1 }), /Unknown/);
    assert.strictEqual(settings.update(free, { defaultVolume: 60, voteSkip: true }).defaultVolume, 60);
    assert.strictEqual(settings.update(free, { alwaysOn: false }).alwaysOn, false, 'disabling is always allowed');

    const [k] = premium.generateKeys({ tier: 'plus', days: 0, createdBy: 'o' });
    premium.redeem({ code: k, guildId: free, userId: 'u' });
    const s = settings.update(free, { alwaysOn: true, defaultVolume: 180, defaultFilter: 'nightcore' }, { filters: Object.keys(FILTERS), stations: [] });
    assert.strictEqual(s.alwaysOn, true);
    assert.strictEqual(s.defaultVolume, 180);
});

test('every filter preset is a valid string or null', () => {
    for (const [id, f] of Object.entries(FILTERS)) {
        assert.ok(f.af === null || typeof f.af === 'string', id);
        assert.ok(f.label && f.emoji, id);
    }
});
