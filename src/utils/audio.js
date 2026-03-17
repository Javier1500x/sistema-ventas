export const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // High pitched square wave sounds like a laser scanner beep
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime); 

    // Quick fade out
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
  } catch (error) {
    // Silently handle autoplay restrictions or missing audio support
    console.warn("Scanner beep ignored (browser restriction or lack of support)", error);
  }
};
