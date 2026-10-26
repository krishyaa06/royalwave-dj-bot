const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const brand = require('../../bot.config');
const config = require('../config');
const { duration, progressBar, truncate } = require('./format');
const { FILTERS } = require('./filters');

const FOOTER = { text: `${brand.name} • ${brand.footer}` };
const C = brand.colors;

const base = (color = C.brand) => new EmbedBuilder().setColor(color).setFooter(FOOTER);

const success = d => base(C.success).setDescription(`${brand.emoji.ok} ${d}`);
const error = d => base(C.danger).setDescription(`${brand.emoji.error} ${d}`);
const info = d => base(C.brand).setDescription(d);

const trackLink = t => (t.source === 'direct' || t.source === 'radio') ? `**${truncate(t.title, 70)}**` : `**[${truncate(t.title, 70)}](${t.url})**`;

function nowPlaying(player) {
    const t = player.current;
    const pos = player.position();
    const bar = t.live
        ? `🔴 **LIVE** ${brand.emoji.wave}`
        : `\`${duration(pos)}\` ${progressBar(pos, t.duration, 18, brand.bar)} \`${duration(t.duration)}\``;
    const e = base()
        .setAuthor({ name: `${brand.emoji.brand} Now playing` })
        .setDescription(`${trackLink(t)}\n${t.author ? `by ${t.author}\n` : ''}\n${bar}`)
        .addFields(
            { name: 'Requested by', value: t.requestedBy ? `<@${t.requestedBy.id}>` : '—', inline: true },
            { name: 'Volume', value: `${player.volume}%`, inline: true },
            { name: 'Loop', value: player.loop, inline: true },
            ...(player.filter !== 'off' ? [{ name: 'Filter', value: `${FILTERS[player.filter].emoji} ${FILTERS[player.filter].label}`, inline: true }] : []),
            { name: 'Up next', value: player.queue[0] ? truncate(player.queue[0].title, 50) : 'Nothing queued', inline: true }
        );
    if (t.thumbnail) e.setThumbnail(t.thumbnail);
    return e;
}

function controls(player) {
    const b = (id, emoji, style = ButtonStyle.Secondary) => new ButtonBuilder().setCustomId(`mp:${id}`).setEmoji(emoji).setStyle(style);
    return [new ActionRowBuilder().addComponents(
        b('pause', player.paused ? '▶️' : '⏸️', ButtonStyle.Primary),
        b('skip', '⏭️'),
        b('stop', '⏹️', ButtonStyle.Danger),
        b('loop', '🔁'),
        b('shuffle', '🔀')
    )];
}

function premiumUpsell(feature) {
    return {
        embeds: [base(C.premium)
            .setTitle(`${brand.emoji.premium} ${feature} is a Premium feature`)
            .setDescription(`Unlock **${feature}**, 24/7 mode, audio filters, saved playlists, autoplay and volume up to 200% for this server.\n\nPremium starts at **${brand.premium.prices.premium}**.`)],
        components: [new ActionRowBuilder().addComponents(
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Get Premium').setEmoji('💎').setURL(config.links.buy),
            new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Compare plans').setURL(`${brand.links.panel}#/premium/${brand.id}`)
        )],
        ephemeral: true
    };
}

module.exports = { base, success, error, info, nowPlaying, controls, premiumUpsell, trackLink };
