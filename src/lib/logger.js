const c = {
    reset: '\x1b[0m', dim: '\x1b[2m', cyan: '\x1b[36m', green: '\x1b[32m',
    yellow: '\x1b[33m', red: '\x1b[31m', magenta: '\x1b[35m'
};

const stamp = () => new Date().toISOString().slice(11, 19);
const line = (color, tag, args) =>
    console.log(`${c.dim}${stamp()}${c.reset} ${color}${tag.padEnd(5)}${c.reset}`, ...args);

module.exports = {
    info: (...a) => line(c.cyan, 'INFO', a),
    ok: (...a) => line(c.green, 'OK', a),
    warn: (...a) => line(c.yellow, 'WARN', a),
    error: (...a) => line(c.red, 'ERROR', a),
    banner(name, version) {
        console.log(`${c.magenta}
   ╔═══════════════════════════════════════╗
   ║   🔷  ${name.padEnd(22)} v${version.padEnd(6)} ║
   ║       by Prism Protocol               ║
   ╚═══════════════════════════════════════╝${c.reset}`);
    }
};
