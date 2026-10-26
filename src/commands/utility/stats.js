const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { stats } = require('../../lib/db');
const { duration } = require('../../lib/format');
const pkg = require('../../../package.json');

module.exports = {
    data: new SlashCommandBuilder().setName('stats').setDescription('Bot statistics'),
    async execute(interaction, client) {
        const m = client.music.stats();
        await interaction.reply({
            embeds: [embeds.base().setTitle('📊 Stats').addFields(
                { name: 'Servers', value: String(client.guilds.cache.size), inline: true },
                { name: 'Playing now', value: `${m.playing} servers · ${m.listeners} listeners`, inline: true },
                { name: 'Uptime', value: duration(process.uptime()), inline: true },
                { name: 'Tracks played', value: String(stats.data.tracksPlayed), inline: true },
                { name: 'Music streamed', value: `${Math.round(stats.data.secondsPlayed / 3600)} h`, inline: true },
                { name: 'Version', value: `v${pkg.version}`, inline: true }
            )]
        });
    }
};
