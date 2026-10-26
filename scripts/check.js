/**
 * Offline sanity check: loads every command, validates the slash-command
 * JSON with discord.js builders and prints a summary. No token needed.
 */
const { loadCommands } = require('../src/lib/loader');

const commands = loadCommands();
let options = 0;
for (const cmd of commands.values()) {
    const json = cmd.data.toJSON();
    options += (json.options || []).length;
    if (json.description.length > 100) throw new Error(`/${json.name} description too long`);
}
console.log(`✔ ${commands.size} commands valid (${options} top-level options)`);
for (const [name, cmd] of commands) console.log(`  /${name.padEnd(14)} [${cmd.category}]`);
