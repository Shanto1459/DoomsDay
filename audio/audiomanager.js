class AudioManager {
  constructor() {
    this.bgm = null;
    this.masterVolume = 1; // 0..1
    this.unlocked = false;
  }

  // Call once after a user gesture (click)
  unlock() {
    this.unlocked = true;
    // If bgm exists and should be playing, you can start it here if you want.
  }

  setMasterVolume(v) {
    this.masterVolume = Math.max(0, Math.min(1, v));
    if (this.bgm) this.bgm.volume = this.masterVolume;
  }

  playBGM(path) {
    if (!this.unlocked) return; // browser restriction

    if (!this.bgm) {
      this.bgm = new Audio(path);
      this.bgm.loop = true;
    }

    this.bgm.volume = this.masterVolume;

    // play() returns a promise; ignore autoplay errors safely
    this.bgm.play().catch((err) => {
      console.warn("BGM play blocked (need user interaction):", err);
    });
  }

  stopBGM() {
    if (!this.bgm) return;
    this.bgm.pause();
    this.bgm.currentTime = 0;
  }
}
