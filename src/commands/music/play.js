const { SlashCommandBuilder } = require('discord.js');
const sources = require('../../lib/sources');
const embeds = require('../../lib/embeds');
const { inVoice, fail } = require('../../lib/guards');
const { tierOf } = require('../../lib/premium');
const { duration } = require('../../lib/format');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song: name (SoundCloud search), SoundCloud link, audio link or station')
        .addStringOption(o => o.setName('query').setDescription('Song name, link or station').setRequired(true).setAutocomplete(true))
        .addBooleanOption(o => o.setName('next').setDescription('Put it at the front of the queue')),
    cooldown: 2,
    async autocomplete(interaction) {
        const q = interaction.options.getFocused();
        await interaction.respond(await sources.suggest(q)).catch(() => {});
    },
    async execute(interaction, client) {
        const existing = client.music.get(interaction.guildId);
        const v = inVoice(interaction, existing);
        if (!v.ok) return fail(interaction, v.msg);
        const me = interaction.guild.members.me;
        if (!v.channel.permissionsFor(me).has(['Connect', 'Speak'])) return fail(interaction, `I need **Connect** and **Speak** in ${v.channel}.`);

        await interaction.deferReply();
        let result;
        try {
            result = await sources.resolve(interaction.options.getString('query'), { id: interaction.user.id, tag: interaction.user.tag });
        } catch (err) {
            return fail(interaction, err.message);
        }

        const tier = tierOf(interaction.guildId);
        const player = client.music.create(interaction.guild);
        const room = tier.queueLimit - player.queue.length;
        if (room <= 0) return fail(interaction, `The queue is full (${tier.queueLimit} tracks on ${tier.name}). Premium raises the limit.`);
        const tracks = result.tracks.slice(0, room);

        try {
            await player.connect(v.channel);
        } catch {
            player.destroy();
            return fail(interaction, 'I could not connect to your voice channel.');
        }
        player.textChannelId = interaction.channelId;

        if (interaction.options.getBoolean('next')) player.queue.unshift(...tracks);
        else player.add(tracks);

        const first = tracks[0];
        const wasIdle = !player.current;
        const msg = result.playlist
            ? `Queued **${tracks.length}** tracks from **${result.playlist}**${tracks.length < result.tracks.length ? ` (limit ${tier.queueLimit})` : ''}.`
            : wasIdle ? `Starting ${embeds.trackLink(first)} \`${duration(first.duration, first.live)}\``
                : `Queued ${embeds.trackLink(first)} at position **#${player.queue.indexOf(first) + 1}**.`;
        await interaction.editReply({ embeds: [embeds.success(msg)] });
        await player.start();
    }
};
