/**
 * audio.js — DoomsDay Sound Engine
 * All sounds synthesized with Web Audio API. No audio files required.
 *
 * Usage:
 *   AudioEngine.init();           // call once on game start (must be after a user gesture)
 *   AudioEngine.playMusic();      // start looping background music
 *   AudioEngine.stopMusic();      // fade out background music
 *   AudioEngine.playPunch();      // player punches
 *   AudioEngine.playHit();        // player punch lands on zombie
 *   AudioEngine.playPlayerHurt(); // player takes damage
 *   AudioEngine.playZombieGrowl();// zombie nearby
 *   AudioEngine.playZombieDie();  // zombie killed
 *   AudioEngine.playGameOver();   // game over screen
 *   AudioEngine.playWin();        // win screen
 *   AudioEngine.setMasterVolume(0.0 - 1.0);
 */

const AudioEngine = (() => {
    let ctx = null;
    let masterGain = null;
    let musicGain = null;
    let sfxGain = null;
    let musicNodes = [];       // active music oscillators/nodes
    let musicPlaying = false;
    let musicScheduler = null;

    // ─── Init ──────────────────────────────────────────────────────────────────

    function init() {
        if (ctx) return; // already initialised
        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();

            masterGain = ctx.createGain();
            masterGain.gain.value = 0.7;
            masterGain.connect(ctx.destination);

            musicGain = ctx.createGain();
            musicGain.gain.value = 0.28;
            musicGain.connect(masterGain);

            sfxGain = ctx.createGain();
            sfxGain.gain.value = 1.0;
            sfxGain.connect(masterGain);

            console.log("[AudioEngine] initialised — sample rate:", ctx.sampleRate);
        } catch (e) {
            console.warn("[AudioEngine] Web Audio API not available:", e);
        }
    }

    function resume() {
        if (ctx && ctx.state === "suspended") ctx.resume();
    }

    function setMasterVolume(v) {
        if (!masterGain) return;
        masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), ctx.currentTime, 0.05);
    }

    // ─── Low-level helpers ─────────────────────────────────────────────────────

    /** Create an oscillator that auto-stops. */
    function osc(type, freq, startTime, duration, gainVal, destination) {
        const g = ctx.createGain();
        g.gain.setValueAtTime(gainVal, startTime);
        g.connect(destination || sfxGain);

        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(freq, startTime);
        o.connect(g);
        o.start(startTime);
        o.stop(startTime + duration);
        return { osc: o, gain: g };
    }

    /** Quick envelope: attack → sustain → release. */
    function env(gainNode, startTime, attackTime, sustainVal, sustainDuration, releaseTime) {
        const g = gainNode.gain;
        g.cancelScheduledValues(startTime);
        g.setValueAtTime(0, startTime);
        g.linearRampToValueAtTime(sustainVal, startTime + attackTime);
        g.setValueAtTime(sustainVal, startTime + attackTime + sustainDuration);
        g.linearRampToValueAtTime(0.0001, startTime + attackTime + sustainDuration + releaseTime);
    }

    /** White noise buffer. */
    function noiseBuffer(duration) {
        const sampleRate = ctx.sampleRate;
        const frameCount = Math.ceil(sampleRate * duration);
        const buffer = ctx.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;
        return buffer;
    }

    /** Play a noise burst with a bandpass filter. */
    function noiseBurst(startTime, duration, filterFreq, filterQ, gainVal, destination) {
        const buf = noiseBuffer(duration + 0.05);
        const src = ctx.createBufferSource();
        src.buffer = buf;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = filterFreq;
        filter.Q.value = filterQ;

        const g = ctx.createGain();
        g.gain.setValueAtTime(gainVal, startTime);
        g.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        src.connect(filter);
        filter.connect(g);
        g.connect(destination || sfxGain);
        src.start(startTime);
        src.stop(startTime + duration + 0.05);
        return src;
    }

    // ─── SFX ──────────────────────────────────────────────────────────────────

    /** Whoosh of a punch swing — air displacement. */
    function playPunch() {
        if (!ctx) return;
        resume();
        const now = ctx.currentTime;

        // Short swoosh: filtered noise sweep
        const buf = noiseBuffer(0.18);
        const src = ctx.createBufferSource();
        src.buffer = buf;

        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(3800, now + 0.12);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.55, now + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

        src.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);
        src.start(now);
        src.stop(now + 0.2);
    }

    /** Meaty thud when punch connects with a zombie. */
    function playHit() {
        if (!ctx) return;
        resume();
        const now = ctx.currentTime;

        // Low thud body impact
        const thud = ctx.createOscillator();
        thud.type = "sine";
        thud.frequency.setValueAtTime(160, now);
        thud.frequency.exponentialRampToValueAtTime(55, now + 0.12);

        const thudGain = ctx.createGain();
        thudGain.gain.setValueAtTime(0.7, now);
        thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        thud.connect(thudGain);
        thudGain.connect(sfxGain);
        thud.start(now);
        thud.stop(now + 0.18);

        // Crunchy noise layer
        noiseBurst(now, 0.08, 900, 3, 0.4);

        // Slight high click
        const click = ctx.createOscillator();
        click.type = "square";
        click.frequency.setValueAtTime(800, now);
        const clickGain = ctx.createGain();
        clickGain.gain.setValueAtTime(0.25, now);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        click.connect(clickGain);
        clickGain.connect(sfxGain);
        click.start(now);
        click.stop(now + 0.05);
    }

    /** Player grunt + low hit when taking damage. */
    function playPlayerHurt() {
        if (!ctx) return;
        resume();
        const now = ctx.currentTime;

        // Low alarm pulse
        const alarm = ctx.createOscillator();
        alarm.type = "sawtooth";
        alarm.frequency.setValueAtTime(220, now);
        alarm.frequency.linearRampToValueAtTime(110, now + 0.2);

        const alarmGain = ctx.createGain();
        alarmGain.gain.setValueAtTime(0.0001, now);
        alarmGain.gain.linearRampToValueAtTime(0.4, now + 0.02);
        alarmGain.gain.linearRampToValueAtTime(0.0001, now + 0.22);

        const distortion = ctx.createWaveShaper();
        distortion.curve = makeDistortionCurve(80);
        distortion.oversample = "2x";

        alarm.connect(distortion);
        distortion.connect(alarmGain);
        alarmGain.connect(sfxGain);
        alarm.start(now);
        alarm.stop(now + 0.25);

        // Body impact thud
        const thud = ctx.createOscillator();
        thud.type = "sine";
        thud.frequency.setValueAtTime(90, now + 0.02);
        thud.frequency.exponentialRampToValueAtTime(40, now + 0.18);
        const thudGain = ctx.createGain();
        thudGain.gain.setValueAtTime(0.5, now + 0.02);
        thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        thud.connect(thudGain);
        thudGain.connect(sfxGain);
        thud.start(now + 0.02);
        thud.stop(now + 0.22);

        // High noise burst
        noiseBurst(now, 0.12, 600, 1.5, 0.3);
    }

    /** Guttural zombie growl — randomised pitch each call. */
    function playZombieGrowl() {
        if (!ctx) return;
        resume();
        const now = ctx.currentTime;

        const baseFreq = 55 + Math.random() * 35;
        const duration = 0.35 + Math.random() * 0.25;

        // Growl oscillator with vibrato
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 4 + Math.random() * 3;

        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 8 + Math.random() * 6;

        const growl = ctx.createOscillator();
        growl.type = "sawtooth";
        growl.frequency.setValueAtTime(baseFreq, now);
        growl.frequency.linearRampToValueAtTime(baseFreq * 0.75, now + duration);

        lfo.connect(lfoGain);
        lfoGain.connect(growl.frequency);

        const distortion = ctx.createWaveShaper();
        distortion.curve = makeDistortionCurve(120);
        distortion.oversample = "4x";

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 600;
        filter.Q.value = 2;

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.5, now + 0.06);
        g.gain.setValueAtTime(0.5, now + duration - 0.08);
        g.gain.linearRampToValueAtTime(0.0001, now + duration);

        growl.connect(distortion);
        distortion.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);

        lfo.start(now);
        lfo.stop(now + duration);
        growl.start(now);
        growl.stop(now + duration + 0.05);

        // Add noise layer for throat texture
        noiseBurst(now + 0.02, duration - 0.04, 180, 4, 0.18);
    }

    /** Zombie death — descending gargle. */
    function playZombieDie() {
        if (!ctx) return;
        resume();
        const now = ctx.currentTime;

        const growl = ctx.createOscillator();
        growl.type = "sawtooth";
        growl.frequency.setValueAtTime(130, now);
        growl.frequency.exponentialRampToValueAtTime(28, now + 0.55);

        const dist = ctx.createWaveShaper();
        dist.curve = makeDistortionCurve(200);
        dist.oversample = "4x";

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + 0.5);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.6, now);
        g.gain.linearRampToValueAtTime(0.0001, now + 0.6);

        growl.connect(dist);
        dist.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);
        growl.start(now);
        growl.stop(now + 0.65);

        noiseBurst(now, 0.5, 300, 2, 0.25);
    }

    // ─── Background Music ──────────────────────────────────────────────────────

    /**
     * Eerie post-apocalyptic ambient loop.
     * Built from: slow bass drone, dissonant pad, rhythmic pulse, sparse melody.
     */
    function playMusic() {
        if (!ctx || musicPlaying) return;
        resume();
        musicPlaying = true;

        // Bass drone — two detuned saws
        function makeDrone() {
            [0, 7].forEach(detune => {
                const o = ctx.createOscillator();
                o.type = "sawtooth";
                o.frequency.value = 55;
                o.detune.value = detune;

                const f = ctx.createBiquadFilter();
                f.type = "lowpass";
                f.frequency.value = 180;
                f.Q.value = 1.5;

                const g = ctx.createGain();
                g.gain.value = 0.18;

                o.connect(f); f.connect(g); g.connect(musicGain);
                o.start();
                musicNodes.push(o, g);
            });
        }

        // Slow dissonant pad: stacked minor 2nds
        function makePad() {
            const freqs = [110, 116.54, 130.81, 138.59]; // A2, Bb2, C3, C#3
            freqs.forEach((freq, i) => {
                const o = ctx.createOscillator();
                o.type = "sine";
                o.frequency.value = freq;

                // Slow tremolo
                const lfo = ctx.createOscillator();
                lfo.type = "sine";
                lfo.frequency.value = 0.3 + i * 0.07;
                const lfoG = ctx.createGain();
                lfoG.gain.value = freq * 0.005;
                lfo.connect(lfoG);
                lfoG.connect(o.frequency);

                const g = ctx.createGain();
                g.gain.value = 0.06;
                o.connect(g); g.connect(musicGain);
                lfo.start(); o.start();
                musicNodes.push(o, lfo, g, lfoG);
            });
        }

        // Rhythmic low pulse (heartbeat feel)
        function schedulePulse() {
            if (!musicPlaying) return;
            const now = ctx.currentTime;

            const kick = ctx.createOscillator();
            kick.type = "sine";
            kick.frequency.setValueAtTime(90, now);
            kick.frequency.exponentialRampToValueAtTime(30, now + 0.18);

            const kickGain = ctx.createGain();
            kickGain.gain.setValueAtTime(0.28, now);
            kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

            kick.connect(kickGain); kickGain.connect(musicGain);
            kick.start(now); kick.stop(now + 0.22);

            // Double-beat
            const kick2 = ctx.createOscillator();
            kick2.type = "sine";
            kick2.frequency.setValueAtTime(80, now + 0.22);
            kick2.frequency.exponentialRampToValueAtTime(28, now + 0.38);
            const kickGain2 = ctx.createGain();
            kickGain2.gain.setValueAtTime(0.18, now + 0.22);
            kickGain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
            kick2.connect(kickGain2); kickGain2.connect(musicGain);
            kick2.start(now + 0.22); kick2.stop(now + 0.42);

            musicScheduler = setTimeout(schedulePulse, 1800 + Math.random() * 400);
        }

        // Sparse creepy melody (pentatonic minor over low A)
        const melodyNotes = [110, 130.81, 146.83, 164.81, 196, 220, 164.81, 130.81];
        let melodyIdx = 0;

        function scheduleMelody() {
            if (!musicPlaying) return;
            const now = ctx.currentTime;
            const freq = melodyNotes[melodyIdx % melodyNotes.length];
            melodyIdx++;

            const o = ctx.createOscillator();
            o.type = "triangle";
            o.frequency.value = freq * 2; // upper octave

            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, now);
            g.gain.linearRampToValueAtTime(0.09, now + 0.08);
            g.gain.setValueAtTime(0.09, now + 0.22);
            g.gain.linearRampToValueAtTime(0.0001, now + 0.55);

            const reverb = createSimpleReverb(1.2);
            o.connect(g); g.connect(reverb); reverb.connect(musicGain);
            o.start(now); o.stop(now + 0.65);

            // Irregular timing feels more eerie
            const nextDelay = 800 + Math.random() * 2400;
            setTimeout(scheduleMelody, nextDelay);
        }

        makeDrone();
        makePad();
        schedulePulse();
        setTimeout(scheduleMelody, 600);

        console.log("[AudioEngine] music started");
    }

    function stopMusic() {
        if (!musicPlaying) return;
        musicPlaying = false;
        clearTimeout(musicScheduler);

        // Fade out
        if (musicGain) {
            musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.5);
        }
        // Stop all tracked nodes after fade
        setTimeout(() => {
            musicNodes.forEach(n => {
                try { n.stop ? n.stop() : n.disconnect(); } catch (_) {}
            });
            musicNodes = [];
            if (musicGain) musicGain.gain.setValueAtTime(0.28, ctx.currentTime);
        }, 1800);

        console.log("[AudioEngine] music stopped");
    }

    // ─── Game Over Music ───────────────────────────────────────────────────────

    function playGameOver() {
        if (!ctx) return;
        resume();
        stopMusic();

        const now = ctx.currentTime + 0.3;

        // Descending funeral toll
        const toll = [220, 196, 174.61, 164.81, 146.83, 130.81, 110];
        toll.forEach((freq, i) => {
            const t = now + i * 0.45;
            const o = ctx.createOscillator();
            o.type = "sine";
            o.frequency.value = freq;

            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.35, t + 0.04);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);

            const reverb = createSimpleReverb(2.5);
            o.connect(g); g.connect(reverb); reverb.connect(sfxGain);
            o.start(t); o.stop(t + 1.5);

            // Dissonant harmonic
            const o2 = ctx.createOscillator();
            o2.type = "sine";
            o2.frequency.value = freq * 1.07;
            const g2 = ctx.createGain();
            g2.gain.setValueAtTime(0.0001, t);
            g2.gain.linearRampToValueAtTime(0.1, t + 0.06);
            g2.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
            o2.connect(g2); g2.connect(reverb);
            o2.start(t); o2.stop(t + 1.2);
        });

        // Low drone build under the tolls
        const drone = ctx.createOscillator();
        drone.type = "sawtooth";
        drone.frequency.value = 55;
        const droneFilter = ctx.createBiquadFilter();
        droneFilter.type = "lowpass";
        droneFilter.frequency.setValueAtTime(80, now);
        droneFilter.frequency.linearRampToValueAtTime(300, now + 3.0);
        const droneGain = ctx.createGain();
        droneGain.gain.setValueAtTime(0.0001, now);
        droneGain.gain.linearRampToValueAtTime(0.22, now + 1.0);
        droneGain.gain.setValueAtTime(0.22, now + 2.5);
        droneGain.gain.linearRampToValueAtTime(0.0001, now + 3.8);
        drone.connect(droneFilter); droneFilter.connect(droneGain); droneGain.connect(sfxGain);
        drone.start(now); drone.stop(now + 4.0);
    }

    // ─── Win Music ─────────────────────────────────────────────────────────────

    function playWin() {
        if (!ctx) return;
        resume();
        stopMusic();

        const now = ctx.currentTime + 0.2;

        // Triumphant ascending fanfare (minor → major lift)
        const fanfare = [
            { freq: 220, t: 0,    dur: 0.18 },
            { freq: 261.63, t: 0.18, dur: 0.18 },
            { freq: 329.63, t: 0.36, dur: 0.18 },
            { freq: 440,    t: 0.54, dur: 0.40 },
            { freq: 392,    t: 0.95, dur: 0.18 },
            { freq: 440,    t: 1.13, dur: 0.55 },
            { freq: 523.25, t: 1.68, dur: 0.85 },
        ];

        fanfare.forEach(({ freq, t, dur }) => {
            const start = now + t;

            [1, 2, 3].forEach((harmonic, hi) => {
                const o = ctx.createOscillator();
                o.type = hi === 0 ? "triangle" : "sine";
                o.frequency.value = freq * harmonic;

                const g = ctx.createGain();
                const vol = hi === 0 ? 0.22 : hi === 1 ? 0.08 : 0.03;
                g.gain.setValueAtTime(0.0001, start);
                g.gain.linearRampToValueAtTime(vol, start + 0.04);
                g.gain.setValueAtTime(vol, start + dur - 0.05);
                g.gain.linearRampToValueAtTime(0.0001, start + dur + 0.08);

                const reverb = createSimpleReverb(1.0);
                o.connect(g); g.connect(reverb); reverb.connect(sfxGain);
                o.start(start); o.stop(start + dur + 0.15);
            });
        });

        // Shimmer layer — high triangle arpeggio
        const shimmerFreqs = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25];
        shimmerFreqs.forEach((freq, i) => {
            const t = now + 1.8 + i * 0.12;
            const o = ctx.createOscillator();
            o.type = "triangle";
            o.frequency.value = freq;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.07, t + 0.04);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
            o.connect(g); g.connect(sfxGain);
            o.start(t); o.stop(t + 0.4);
        });
    }

    // ─── Reverb ────────────────────────────────────────────────────────────────

    function createSimpleReverb(duration) {
        const sampleRate = ctx.sampleRate;
        const length = Math.ceil(sampleRate * duration);
        const impulse = ctx.createBuffer(2, length, sampleRate);
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
            }
        }
        const convolver = ctx.createConvolver();
        convolver.buffer = impulse;
        const wetGain = ctx.createGain();
        wetGain.gain.value = 0.28;
        convolver.connect(wetGain);
        // Return a node that passes dry + wet
        const merger = ctx.createGain();
        merger.gain.value = 1;
        wetGain.connect(merger);
        return merger;
    }

    // ─── Distortion curve ─────────────────────────────────────────────────────

    function makeDistortionCurve(amount) {
        const n = 256;
        const curve = new Float32Array(n);
        const deg = Math.PI / 180;
        for (let i = 0; i < n; i++) {
            const x = (i * 2) / n - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
        }
        return curve;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    return {
        init,
        resume,
        setMasterVolume,
        playMusic,
        stopMusic,
        playPunch,
        playHit,
        playPlayerHurt,
        playZombieGrowl,
        playZombieDie,
        playGameOver,
        playWin,
    };
})();
