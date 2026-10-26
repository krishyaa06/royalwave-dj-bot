const fs = require('node:fs');
const path = require('node:path');

/** Recursively loads every command module from src/commands. */
function loadCommands() {
    const commands = new Map();
    const root = path.join(__dirname, '..', 'commands');

    for (const category of fs.readdirSync(root)) {
        const dir = path.join(root, category);
        if (!fs.statSync(dir).isDirectory()) continue;
        for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
            const command = require(path.join(dir, file));
            if (!command.data || !command.execute) {
                throw new Error(`Command ${category}/${file} is missing "data" or "execute"`);
            }
            command.category = category;
            commands.set(command.data.name, command);
        }
    }
    return commands;
}

function loadEvents(client) {
    const dir = path.join(__dirname, '..', 'events');
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
        const event = require(path.join(dir, file));
        const handler = (...args) => event.execute(...args, client);
        if (event.once) client.once(event.name, handler);
        else client.on(event.name, handler);
    }
}

module.exports = { loadCommands, loadEvents };
