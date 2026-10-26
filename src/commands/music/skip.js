const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const settings = require('../../lib/settings');
const { requirePlayer } = require('../../lib/music');
const { isDJ } = require('../../lib/guards');

/** Shared by /skip and the ⏭️ button. Returns a reply payload. */
function voteOrSkip(interaction, player) {
    const s = settings.get(interaction.guildId);
    if (s.voteSkip && !isDJ(interaction, player)) {
        const ch = interaction.guild.channels.cache.get(player.channelId);
        const listeners = ch ? ch.members.filter(m => !m.user.bot).size : 1;
        const needed = Math.ceil(listeners / 2);
        player.skipVotes.add(interaction.user.id);
        if (player.skipVotes.size < needed) {
            return { embeds: [embeds.info(`🗳️ Skip vote **${player.skipVotes.size}/${needed}**`)] };
        }
    } else if (!s.voteSkip && !isDJ(interaction, player)) {
        return { embeds: [embeds.error('You need the DJ role to skip.')], ephemeral: true };
    }
    const title = player.current?.title;
    player.skip();
    return { embeds: [embeds.success(`Skipped **${title}**.`)] };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current track (or jump to a position)')
        .addIntegerOption(o => o.setName('to').setDescription('Queue position to jump to').setMinValue(1)),
    voteOrSkip,
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client);
        if (!player) return;
        const to = interaction.options.getInteger('to');
        if (to) {
            if (!isDJ(interaction, player)) return interaction.reply({ embeds: [embeds.error('You need the DJ role for that.')], ephemeral: true });
            if (to > player.queue.length) return interaction.reply({ embeds: [embeds.error(`The queue only has ${player.queue.length} tracks.`)], ephemeral: true });
            player.queue.splice(0, to - 1);
            player.skip();
            return interaction.reply({ embeds: [embeds.success(`Jumped to **#${to}**.`)] });
        }
        await interaction.reply(voteOrSkip(interaction, player));
    }
};
