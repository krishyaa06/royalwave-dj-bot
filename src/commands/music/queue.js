const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { duration, truncate } = require('../../lib/format');
const { tierOf } = require('../../lib/premium');

const PAGE = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the queue')
        .addIntegerOption(o => o.setName('page').setDescription('Page number').setMinValue(1)),
    async execute(interaction, client) {
        const player = client.music.get(interaction.guildId);
        if (!player?.current) return interaction.reply({ embeds: [embeds.error('The queue is empty.')], ephemeral: true });
        const pages = Math.max(1, Math.ceil(player.queue.length / PAGE));
        const page = Math.min(interaction.options.getInteger('page') || 1, pages);
        const slice = player.queue.slice((page - 1) * PAGE, page * PAGE);
        const total = player.queue.reduce((a, t) => a + (t.duration || 0), 0);
        const lines = slice.map((t, i) => `\`${String((page - 1) * PAGE + i + 1).padStart(2)}\` ${truncate(t.title, 48)} · \`${duration(t.duration, t.live)}\``);
        const tier = tierOf(interaction.guildId);
        await interaction.reply({
            embeds: [embeds.base()
                .setTitle('🎶 Queue')
                .setDescription(`**Now:** ${embeds.trackLink(player.current)}\n\n${lines.join('\n') || '_Nothing else queued. Add more with /play._'}`)
                .addFields(
                    { name: 'Tracks', value: `${player.queue.length}/${tier.queueLimit}`, inline: true },
                    { name: 'Length', value: duration(total), inline: true },
                    { name: 'Loop', value: player.loop, inline: true }
                )
                .setFooter({ text: `Page ${page}/${pages}` })]
        });
    }
};
