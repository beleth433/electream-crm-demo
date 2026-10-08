/**
 * Web Audio API synthesizer for clean, crisp in-app notifications
 * Produces a pleasant, soft double chime without requiring external mp3 files.
 */
export const playChatNotificationSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Chime Note 1: 880Hz (A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Chime Note 2: 1320Hz (E6) - slightly delayed and ringing
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, now + 0.07);
    gain2.gain.setValueAtTime(0.0001, now + 0.07);
    gain2.gain.exponentialRampToValueAtTime(0.22, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.00001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.07);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.debug('Notification audio playback prevented or not supported:', err);
  }
};
