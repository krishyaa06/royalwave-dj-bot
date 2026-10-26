/** FFmpeg audio filter presets. Every preset except "off" is a Premium feature. */
const FILTERS = {
    off: { label: 'Off', emoji: '⏹️', af: null },
    bassboost: { label: 'Bass Boost', emoji: '🔊', af: 'bass=g=10,dynaudnorm=f=200' },
    nightcore: { label: 'Nightcore', emoji: '🌙', af: 'aresample=48000,asetrate=48000*1.25,aresample=48000', speed: 1.25 },
    vaporwave: { label: 'Vaporwave', emoji: '🌴', af: 'aresample=48000,asetrate=48000*0.8,aresample=48000', speed: 0.8 },
    eightd: { label: '8D Audio', emoji: '🎧', af: 'apulsator=hz=0.08' },
    lofi: { label: 'Lo-Fi', emoji: '📼', af: 'lowpass=f=3200,aecho=0.8:0.6:40:0.25,volume=1.1' },
    karaoke: { label: 'Karaoke', emoji: '🎤', af: 'pan=stereo|c0=c0-c1|c1=c1-c0' },
    treble: { label: 'Treble', emoji: '✨', af: 'treble=g=6' },
    concert: { label: 'Concert Hall', emoji: '🏟️', af: 'aecho=0.8:0.88:60:0.4' },
    slowed: { label: 'Slowed + Reverb', emoji: '🌫️', af: 'aresample=48000,asetrate=48000*0.88,aresample=48000,aecho=0.8:0.7:90:0.3', speed: 0.88 }
};

const choices = () => Object.entries(FILTERS).map(([value, f]) => ({ name: `${f.emoji} ${f.label}`, value }));

module.exports = { FILTERS, choices };
