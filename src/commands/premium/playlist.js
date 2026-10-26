const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../lib/embeds');
const { playlists } = require('../../lib/db');
const { tierOf } = require('../../lib/premium');
const { inVoice, fail } = require('../../lib/guards');

const key = i => i.guildId;
const all = i => (playlists.data[key(i)] ||= {});

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playlist')
        .setDescription('💎 Save and load server playlists')
        .addSubcommand(s => s.setName('save').setDescription('Save the current queue as a playlist')
            .addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true).setMaxLength(32)))
        .addSubcommand(s => s.setName('load').setDescription('Queue a saved playlist')
            .addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true).setAutocomplete(true)))
        .addSubcommand(s => s.setName('list').setDescription('Show saved playlists'))
        .addSubcommand(s => s.setName('delete').setDescription('Delete a playlist')
            .addStringOption(o => o.setName('name').setDescription('Playlist name').setRequired(true).setAutocomplete(true))),
    premium: true,
    async autocomplete(interaction) {
        const q = interaction.options.getFocused().toLowerCase();
        await interaction.respond(Object.keys(all(interaction)).filter(n => n.toLowerCase().includes(q)).slice(0, 25).map(n => ({ name: n, value: n })));
    },
    async execute(interaction, client) {
        const tier = tierOf(interaction.guildId);
        if (!tier.playlists) return interaction.reply(embeds.premiumUpsell('Saved playlists'));
        const sub = interaction.options.getSubcommand();
        const lists = all(interaction);
        const name = interaction.options.getString('name');

        if (sub === 'list') {
            const rows = Object.entries(lists).map(([n, p]) => `📁 **${n}** · ${p.tracks.length} tracks`);
            return interaction.reply({ embeds: [embeds.base().setTitle('Saved playlists').setDescription(rows.join('\n') || '_None yet. Use /playlist save._').setFooter({ text: `${rows.length}/${tier.playlists} on ${tier.name}` })] });
        }
        if (sub === 'delete') {
            if (!lists[name]) return fail(interaction, 'No playlist with that name.');
            delete lists[name]; playlists.save();
            return interaction.reply({ embeds: [embeds.success(`Deleted **${name}**.`)] });
        }
        if (sub === 'save') {
            const player = client.music.get(interaction.guildId);
            const tracks = player ? [player.current, ...player.queue].filter(Boolean) : [];
            if (!tracks.length) return fail(interaction, 'Nothing to save. Queue some music first.');
            if (!lists[name] && Object.keys(lists).length >= tier.playlists) return fail(interaction, `You can save ${tier.playlists} playlists on ${tier.name}.`);
            lists[name] = {
                createdBy: interaction.user.id, savedAt: Date.now(),
                tracks: tracks.slice(0, tier.playlistSize).map(({ title, author, url, source, duration, live, thumbnail, stationId }) => ({ title, author, url, source, duration, live, thumbnail, stationId }))
            };
            playlists.save();
            return interaction.reply({ embeds: [embeds.success(`Saved **${lists[name].tracks.length}** tracks as **${name}**.`)] });
        }
        // load
        const pl = lists[name];
        if (!pl) return fail(interaction, 'No playlist with that name.');
        const v = inVoice(interaction, client.music.get(interaction.guildId));
        if (!v.ok) return fail(interaction, v.msg);
        await interaction.deferReply();
        const player = client.music.create(interaction.guild);
        try { await player.connect(v.channel); } catch { player.destroy(); return fail(interaction, 'I could not connect to your voice channel.'); }
        player.textChannelId = interaction.channelId;
        const room = tier.queueLimit - player.queue.length;
        player.add(pl.tracks.slice(0, room).map(t => ({ ...t, requestedBy: { id: interaction.user.id, tag: interaction.user.tag } })));
        await interaction.editReply({ embeds: [embeds.success(`Loaded **${Math.min(room, pl.tracks.length)}** tracks from **${name}**.`)] });
        await player.start();
    }
};
