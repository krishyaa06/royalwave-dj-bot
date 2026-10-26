const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../lib/embeds');
const brand = require('../../../bot.config');
const config = require('../../config');

const GROUPS = { music: '🎵 Music', premium: '💎 Premium', utility: '🧰 Utility' };

module.exports = {
    data: new SlashCommandBuilder().setName('help').setDescription(`Everything ${brand.short} can do`),
    async execute(interaction, client) {
        const byGroup = {};
        for (const cmd of client.commands.values()) {
            if (cmd.owner) continue;
            (byGroup[cmd.category] ||= []).push(`\`/${cmd.data.name}\` ${cmd.data.description.replace(/^💎 /, '')}${cmd.premium ? ' 💎' : ''}`);
        }
        const e = embeds.base()
            .setAuthor({ name: brand.name, iconURL: client.user.displayAvatarURL() })
            .setDescription(`${brand.tagline}\n\n${brand.emoji.brand} **Start:** join a voice channel and run \`/play\` with a song name.`)
            .addFields(Object.entries(GROUPS).filter(([k]) => byGroup[k]).map(([k, label]) => ({ name: label, value: byGroup[k].join('\n') })));
        await interaction.reply({
            embeds: [e],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Dashboard').setURL(`${brand.links.panel}#/bot/${brand.id}`),
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Premium').setEmoji('💎').setURL(config.links.buy),
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Support').setURL(brand.links.support)
            )]
        });
    }
};
