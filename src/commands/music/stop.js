const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { requirePlayer } = require('../../lib/music');

module.exports = {
    data: new SlashCommandBuilder().setName('stop').setDescription('Stop playback and clear the queue'),
    async execute(interaction, client) {
        const player = requirePlayer(interaction, client, { dj: true, playing: false });
        if (!player) return;
        player.stop();
        await interaction.reply({ embeds: [embeds.success('Stopped and cleared the queue.')] });
    }
};
