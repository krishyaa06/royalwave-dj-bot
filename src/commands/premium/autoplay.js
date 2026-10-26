const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../lib/embeds');
const settings = require('../../lib/settings');
const sources = require('../../lib/sources');
const { hasPremium } = require('../../lib/guards');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('💎 When the queue ends, keep playing your favourite station')
        .addBooleanOption(o => o.setName('enabled').setDescription('On or off').setRequired(true))
        .addStringOption(o => o.setName('station').setDescription('Station to fall back to').addChoices(
            ...sources.STATIONS.slice(0, 25).map(s => ({ name: s.name, value: s.id }))
        ))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    premium: true,
    async execute(interaction) {
        const on = interaction.options.getBoolean('enabled');
        if (on && !hasPremium(interaction.guildId, 'autoplay')) return interaction.reply(embeds.premiumUpsell('Autoplay'));
        const station = interaction.options.getString('station');
        settings.update(interaction.guildId, { autoplay: on, ...(station ? { favouriteStation: station } : {}) }, { stations: sources.stationIds() });
        const s = settings.get(interaction.guildId);
        const name = sources.STATIONS.find(x => x.id === s.favouriteStation)?.name || sources.STATIONS[0].name;
        await interaction.reply({ embeds: [embeds.success(on ? `Autoplay is **on** → **${name}**.` : 'Autoplay is **off**.')] });
    }
};
