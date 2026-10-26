/**
 * Helper used by commands: "get the player or explain why not".
 */
const { fail, inVoice, isDJ } = require('./guards');

function requirePlayer(interaction, client, { dj = false, playing = true } = {}) {
    const player = client.music.get(interaction.guildId);
    if (!player || (playing && !player.current)) {
        fail(interaction, 'Nothing is playing right now.');
        return null;
    }
    const v = inVoice(interaction, player);
    if (!v.ok) { fail(interaction, v.msg); return null; }
    if (dj && !isDJ(interaction, player)) { fail(interaction, 'You need the DJ role for that.'); return null; }
    return player;
}

module.exports = { requirePlayer };
