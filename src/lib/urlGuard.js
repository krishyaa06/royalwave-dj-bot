/**
 * Blocks requests to local / private networks (SSRF protection) before a
 * user-supplied URL is handed to FFmpeg.
 */
const dns = require('node:dns').promises;
const net = require('node:net');

const PRIVATE_V4 = [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.168.0.0', 16], ['198.18.0.0', 15],
    ['224.0.0.0', 4], ['240.0.0.0', 4]
];

const toInt = ip => ip.split('.').reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;

function isPrivateIp(ip) {
    if (net.isIPv4(ip)) {
        const n = toInt(ip);
        return PRIVATE_V4.some(([base, bits]) => {
            const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
            return (n & mask) === (toInt(base) & mask);
        });
    }
    if (net.isIPv6(ip)) {
        const v = ip.toLowerCase();
        if (v.startsWith('::ffff:')) return isPrivateIp(v.slice(7));
        return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80');
    }
    return true;
}

async function assertPublicUrl(raw) {
    let url;
    try { url = new URL(raw); } catch { throw new Error('That is not a valid URL.'); }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Only http(s) links are supported.');
    if (url.username || url.password) throw new Error('Links with credentials are not allowed.');
    const host = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map(a => a.address);
    if (!addresses.length || addresses.some(isPrivateIp)) throw new Error('That host is not reachable from the bot.');
    return url;
}

module.exports = { isPrivateIp, assertPublicUrl };
