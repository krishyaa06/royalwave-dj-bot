const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../lib/embeds');
const { TIERS, getGuild } = require('../../lib/premium');
const config = require('../../config');
const brand = require('../../../bot.config');

const yes = v => (v ? '✅' : '—');

module.exports = {
    data: new SlashCommandBuilder().setName('premium').setDescription('See this server’s plan and what Premium unlocks'),
    async execute(interaction) {
        const g = getGuild(interaction.guildId);
        const status = g.active
            ? `${brand.emoji.premium} This server has **${g.tier.name}**${g.expiresAt ? ` until <t:${Math.floor(g.expiresAt / 1000)}:D>` : ' (lifetime)'}.`
            : 'This server is on the **Free** plan.';
        const f = TIERS.free; const p = TIERS.premium; const x = TIERS.plus;
        const table = [
            '```',
            'Feature            Free   Premium  Premium+',
            `Queue size         ${String(f.queueLimit).padEnd(7)}${String(p.queueLimit).padEnd(9)}${x.queueLimit}`,
            `Max volume         ${String(f.maxVolume + '%').padEnd(7)}${String(p.maxVolume + '%').padEnd(9)}${x.maxVolume}%`,
            `Audio filters      ${yes(f.filters).padEnd(6)}${yes(p.filters).padEnd(8)}${yes(x.filters)}`,
            `24/7 mode          ${yes(f.alwaysOn).padEnd(6)}${yes(p.alwaysOn).padEnd(8)}${yes(x.alwaysOn)}`,
            `Autoplay radio     ${yes(f.autoplay).padEnd(6)}${yes(p.autoplay).padEnd(8)}${yes(x.autoplay)}`,
            `Saved playlists    ${String(f.playlists).padEnd(7)}${String(p.playlists).padEnd(9)}${x.playlists}`,
            '```'
        ].join('\n');
        await interaction.reply({
            embeds: [embeds.base(brand.colors.premium)
                .setTitle(`${brand.emoji.premium} ${brand.short} Premium`)
                .setDescription(`${status}\n${table}\n**Premium** ${brand.premium.prices.premium} · **Premium+** ${brand.premium.prices.plus}\nAfter buying you get a key. Redeem it with \`/redeem\` or on the web panel.`)],
            components: [new ActionRowBuilder().addComponents(
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Buy Premium').setEmoji('💎').setURL(config.links.buy),
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Web panel').setURL(`${brand.links.panel}#/premium/${brand.id}`),
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Support').setURL(brand.links.support)
            )]
        });
    }
};
