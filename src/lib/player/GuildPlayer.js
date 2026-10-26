/**
 * One player per server: queue, loop modes, volume, filters, seek, 24/7.
 * Audio is transcoded by FFmpeg to raw PCM so filters and seeking work for every source.
 */
const { spawn } = require('node:child_process');
const {
    joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus,
    VoiceConnectionStatus, entersState, StreamType, NoSubscriberBehavior
} = require('@discordjs/voice');
const ffmpegPath = require('ffmpeg-static') || 'ffmpeg';
const { FILTERS } = require('../filters');
const sources = require('../sources');
const { stats } = require('../db');
const { tierOf } = require('../premium');
const log = require('../logger');

class GuildPlayer {
    constructor(manager, guild, { volume = 80, filter = 'off' } = {}) {
        this.manager = manager;
        this.guild = guild;
        this.queue = [];
        this.history = [];
        this.current = null;
        this.loop = 'off'; // off | track | queue
        this.volume = volume;
        this.filter = filter;
        this.textChannelId = null;
        this.connection = null;
        this.ffmpeg = null;
        this.startedAt = 0; // timestamp when position 0 would have been
        this.pausedAt = 0;
        this.skipVotes = new Set();
        this.idleTimer = null;

        this.audio = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } });
        this.switching = false; // true while restarting FFmpeg for seek / filter changes
        this.audio.on(AudioPlayerStatus.Idle, () => { if (!this.switching) this.#onTrackEnd(); });
        this.audio.on('error', err => {
            log.warn(`[${guild.id}] audio error: ${err.message}`);
            this.manager.emit('trackError', this, this.current, err);
        });
    }

    get playing() { return this.audio.state.status === AudioPlayerStatus.Playing; }
    get paused() { return this.audio.state.status === AudioPlayerStatus.Paused || this.audio.state.status === AudioPlayerStatus.AutoPaused; }
    get channelId() { return this.connection?.joinConfig.channelId ?? null; }

    /** Current position in seconds (accounts for pause and speed-changing filters). */
    position() {
        if (!this.current || !this.startedAt) return 0;
        const end = this.paused ? this.pausedAt : Date.now();
        const speed = FILTERS[this.filter]?.speed || 1;
        return Math.max(0, ((end - this.startedAt) / 1000) * speed);
    }

    async connect(voiceChannel) {
        if (this.connection && this.channelId === voiceChannel.id) return;
        this.connection?.destroy();
        this.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: this.guild.id,
            adapterCreator: this.guild.voiceAdapterCreator,
            selfDeaf: true
        });
        this.connection.subscribe(this.audio);
        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000)
                ]);
            } catch {
                this.destroy();
            }
        });
        await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    }

    add(tracks) {
        this.queue.push(...tracks);
        clearTimeout(this.idleTimer);
    }

    async start() {
        if (!this.current) await this.next();
    }

    async next() {
        if (this.current && this.loop === 'queue') this.queue.push(this.current);
        if (this.current) this.history.unshift(this.current);
        this.history.length = Math.min(this.history.length, 25);
        this.current = this.queue.shift() || null;
        this.skipVotes.clear();
        if (!this.current) return this.#onQueueEnd();
        return this.#play(this.current, 0);
    }

    async #play(track, seek = 0) {
        this.switching = true;
        this.#killFfmpeg();
        let input;
        try {
            input = await sources.input(track);
        } catch (err) {
            this.switching = false;
            log.warn(`[${this.guild.id}] could not open ${track.title}: ${err.message}`);
            this.manager.emit('trackError', this, track, err);
            this.current = null;
            return this.next();
        }
        const isUrl = typeof input === 'string';
        const af = FILTERS[this.filter]?.af;
        const args = [
            ...(isUrl ? ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5'] : []),
            ...(seek > 0 ? ['-ss', String(seek)] : []),
            '-i', isUrl ? input : 'pipe:0',
            '-analyzeduration', '0', '-loglevel', '0', '-vn',
            ...(af ? ['-af', af] : []),
            '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1'
        ];
        const proc = spawn(ffmpegPath, args, { stdio: ['pipe', 'pipe', 'ignore'] });
        proc.on('error', err => log.error('FFmpeg failed to start:', err.message));
        proc.stdin.on('error', () => {});
        if (!isUrl) {
            input.on('error', () => {});
            input.pipe(proc.stdin);
        } else {
            proc.stdin.end();
        }
        this.ffmpeg = proc;

        const resource = createAudioResource(proc.stdout, { inputType: StreamType.Raw, inlineVolume: true });
        resource.volume.setVolume(this.volume / 100);
        this.resource = resource;
        const speed = FILTERS[this.filter]?.speed || 1;
        this.startedAt = Date.now() - (seek / speed) * 1000;
        this.audio.play(resource);
        this.switching = false;
        if (seek === 0) {
            stats.data.tracksPlayed++;
            const day = new Date().toISOString().slice(0, 10);
            stats.data.daily[day] = (stats.data.daily[day] || 0) + 1;
            stats.save();
            this.manager.emit('trackStart', this, track);
        }
    }

    #killFfmpeg() {
        if (this.ffmpeg) {
            this.ffmpeg.stdout.removeAllListeners();
            this.ffmpeg.kill('SIGKILL');
            this.ffmpeg = null;
        }
    }

    #onTrackEnd() {
        if (this.current && !this.current.live) {
            stats.data.secondsPlayed += Math.round(this.position());
            stats.save();
        }
        if (this.current && this.loop === 'track') return this.#play(this.current, 0);
        return this.next();
    }

    #onQueueEnd() {
        this.startedAt = 0;
        const s = this.manager.settingsFor(this.guild.id);
        const last = this.history[0];
        if (s.autoplay && tierOf(this.guild.id).autoplay) {
            const station = sources.STATIONS.find(st => st.id === s.favouriteStation) || sources.STATIONS[0];
            if (station && !(last && last.stationId === station.id && last.autoplay)) {
                this.add([{ ...sources.stationTrack(station, { id: this.guild.client.user.id, tag: 'Autoplay' }), autoplay: true }]);
                return this.next();
            }
        }
        this.manager.emit('queueEnd', this);
        this.#armIdle();
    }

    /** Leave after 3 idle minutes unless 24/7 mode is on (Premium). */
    #armIdle() {
        clearTimeout(this.idleTimer);
        const s = this.manager.settingsFor(this.guild.id);
        if (s.alwaysOn && tierOf(this.guild.id).alwaysOn) return;
        this.idleTimer = setTimeout(() => { if (!this.current) this.destroy(); }, 3 * 60_000);
        this.idleTimer.unref?.();
    }

    pause() { if (this.playing) { this.audio.pause(); this.pausedAt = Date.now(); return true; } return false; }

    resume() {
        if (!this.paused) return false;
        this.startedAt += Date.now() - this.pausedAt;
        this.audio.unpause();
        return true;
    }

    skip() { this.loop = this.loop === 'track' ? 'off' : this.loop; this.audio.stop(true); }

    stop() {
        this.queue = [];
        this.loop = 'off';
        this.current = null;
        this.startedAt = 0;
        this.switching = true; // do not treat a manual stop as "track ended"
        this.#killFfmpeg();
        this.audio.stop(true);
        this.switching = false;
        this.#armIdle();
    }

    setVolume(v) {
        this.volume = v;
        this.resource?.volume?.setVolume(v / 100);
    }

    async seek(seconds) {
        if (!this.current || this.current.live) throw new Error('This track cannot be seeked.');
        if (this.current.duration && seconds >= this.current.duration) throw new Error('That is past the end of the track.');
        await this.#play(this.current, seconds);
    }

    async setFilter(name) {
        this.filter = FILTERS[name] ? name : 'off';
        if (this.current) await this.#play(this.current, this.current.live ? 0 : this.position());
    }

    shuffle() {
        for (let i = this.queue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
        }
    }

    remove(index) { return this.queue.splice(index, 1)[0]; }

    move(from, to) {
        const [t] = this.queue.splice(from, 1);
        if (t) this.queue.splice(to, 0, t);
        return t;
    }

    destroy() {
        this.stop();
        clearTimeout(this.idleTimer);
        try { this.connection?.destroy(); } catch { /* already destroyed */ }
        this.connection = null;
        this.manager.players.delete(this.guild.id);
        this.manager.emit('destroy', this);
    }

    toJSON() {
        return {
            current: this.current ? { ...this.current, position: Math.round(this.position()) } : null,
            queue: this.queue.slice(0, 50),
            queueLength: this.queue.length,
            loop: this.loop, volume: this.volume, filter: this.filter,
            paused: this.paused, channelId: this.channelId
        };
    }
}

module.exports = GuildPlayer;
