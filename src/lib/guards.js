/**
 * Shared checks for music commands.
 */
const { PermissionFlagsBits } = require('discord.js');
const embeds = require('./embeds');
const settings = require('./settings');
const { tierOf } = require('./premium');

const fail = (interaction, msg) => {
    const payload = { embeds: [embeds.error(msg)], ephemeral: true };
    return (interaction.deferred || interaction.replied) ? interaction.editReply(payload) : interaction.reply(payload);
};

/** User must be in a voice channel (and the same one as the bot if it is connected). */
function inVoice(interaction, player) {
    const channel = interaction.member?.voice?.channel;
    if (!channel) return { ok: false, msg: 'Join a voice channel first.' };
    if (player?.channelId && player.channelId !== channel.id) return { ok: false, msg: `I'm already playing in <#${player.channelId}>.` };
    return { ok: true, channel };
}

/** DJ role check. Managers and lone listeners always pass. */
function isDJ(interaction, player) {
    const { djRoleId } = settings.get(interaction.guildId);
    if (!djRoleId) return true;
    const m = interaction.member;
    if (m.permissions.has(PermissionFlagsBits.ManageGuild) || m.roles.cache.has(djRoleId)) return true;
    const ch = player?.channelId && interaction.guild.channels.cache.get(player.channelId);
    return Boolean(ch && ch.members.filter(x => !x.user.bot).size <= 1);
}

const hasPremium = (guildId, feature) => Boolean(tierOf(guildId)[feature]);

module.exports = { fail, inVoice, isDJ, hasPremium };
