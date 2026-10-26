const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const sources = require('../../lib/sources');
const settings = require('../../lib/settings');
const { inVoice, fail } = require('../../lib/guards');
const brand = require('../../../bot.config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('radio')
        .setDescription(`Tune in to a ${brand.short} 24/7 radio station`)
        .addStringOption(o => o.setName('station').setDescription('Station').addChoices(
            ...sources.STATIONS.slice(0, 25).map(s => ({ name: `${s.name} · ${s.genre}`, value: s.id }))
        )),
    async execute(interaction, client) {
        const id = interaction.options.getString('station') || settings.get(interaction.guildId).favouriteStation;
        if (!id) {
            const list = sources.STATIONS.map(s => `${brand.emoji.radio} **${s.name}** · ${s.genre}`).join('\n');
            return interaction.reply({ embeds: [embeds.base().setTitle(`${brand.emoji.radio} ${brand.short} Radio`).setDescription(`${list}\n\nPick one with \`/radio station:\`.`)] });
        }
        const station = sources.STATIONS.find(s => s.id === id);
        const player0 = client.music.get(interaction.guildId);
        const v = inVoice(interaction, player0);
        if (!v.ok) return fail(interaction, v.msg);
        await interaction.deferReply();
        const player = client.music.create(interaction.guild);
        try { await player.connect(v.channel); } catch { player.destroy(); return fail(interaction, 'I could not connect to your voice channel.'); }
        player.textChannelId = interaction.channelId;
        player.queue.unshift(sources.stationTrack(station, { id: interaction.user.id, tag: interaction.user.tag }));
        if (player.current) player.skip(); else await player.start();
        await interaction.editReply({ embeds: [embeds.success(`Tuned in to **${station.name}** (${station.genre}).`)] });
    }
};
