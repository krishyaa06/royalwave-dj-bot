const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../lib/embeds');
const settings = require('../../lib/settings');
const { getGuild } = require('../../lib/premium');
const brand = require('../../../bot.config');

const onOff = v => (v ? '`on`' : '`off`');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Configure the bot for this server (or use the web panel)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(s => s.setName('view').setDescription('Show current settings'))
        .addSubcommand(s => s.setName('djrole').setDescription('Set or clear the DJ role')
            .addRoleOption(o => o.setName('role').setDescription('Leave empty to let everyone control music')))
        .addSubcommand(s => s.setName('volume').setDescription('Default volume when the bot joins')
            .addIntegerOption(o => o.setName('level').setDescription('1-200').setRequired(true).setMinValue(1).setMaxValue(200)))
        .addSubcommand(s => s.setName('announce').setDescription('Post a now-playing card for each track')
            .addBooleanOption(o => o.setName('enabled').setDescription('On or off').setRequired(true)))
        .addSubcommand(s => s.setName('voteskip').setDescription('Require votes for non-DJ skips')
            .addBooleanOption(o => o.setName('enabled').setDescription('On or off').setRequired(true))),
    async execute(interaction) {
        const gid = interaction.guildId;
        const sub = interaction.options.getSubcommand();
        try {
            if (sub === 'djrole') settings.update(gid, { djRoleId: interaction.options.getRole('role')?.id ?? null });
            if (sub === 'volume') settings.update(gid, { defaultVolume: interaction.options.getInteger('level') });
            if (sub === 'announce') settings.update(gid, { announceTracks: interaction.options.getBoolean('enabled') });
            if (sub === 'voteskip') settings.update(gid, { voteSkip: interaction.options.getBoolean('enabled') });
        } catch (err) {
            return interaction.reply({ embeds: [embeds.error(err.message)], ephemeral: true });
        }
        const s = settings.get(gid);
        const g = getGuild(gid);
        await interaction.reply({
            embeds: [embeds.base().setTitle('⚙️ Server settings').addFields(
                { name: 'Plan', value: `${g.active ? brand.emoji.premium : ''} ${g.tier.name}`, inline: true },
                { name: 'DJ role', value: s.djRoleId ? `<@&${s.djRoleId}>` : 'everyone', inline: true },
                { name: 'Default volume', value: `${s.defaultVolume}%`, inline: true },
                { name: 'Announce tracks', value: onOff(s.announceTracks), inline: true },
                { name: 'Vote skip', value: onOff(s.voteSkip), inline: true },
                { name: 'Leave when alone', value: onOff(s.autoLeave), inline: true },
                { name: '24/7 💎', value: onOff(s.alwaysOn), inline: true },
                { name: 'Autoplay 💎', value: onOff(s.autoplay), inline: true },
                { name: 'Default filter 💎', value: `\`${s.defaultFilter}\``, inline: true }
            ).setDescription(sub === 'view' ? `More options on the [web panel](${brand.links.panel}#/dashboard/${brand.id}).` : `${brand.emoji.ok} Saved.`)],
            ephemeral: sub === 'view'
        });
    }
};
