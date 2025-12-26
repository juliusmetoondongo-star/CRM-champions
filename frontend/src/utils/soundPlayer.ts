// src/utils/soundPlayer.ts

/**
 * Utility to play access control sounds
 */

// Preload audio instances for faster playback
let accessGrantedAudio: HTMLAudioElement | null = null;
let accessDeniedAudio: HTMLAudioElement | null = null;

/**
 * Initialize audio instances
 */
function initAudio() {
  if (typeof window === 'undefined') return;

  // Create audio for access granted (high beep)
  if (!accessGrantedAudio) {
    accessGrantedAudio = new Audio();
    // We'll use Web Audio API to generate a pleasant success beep
    generateSuccessSound().then(url => {
      if (accessGrantedAudio) accessGrantedAudio.src = url;
    });
  }

  // Create audio for access denied (low buzz)
  if (!accessDeniedAudio) {
    accessDeniedAudio = new Audio();
    // We'll use Web Audio API to generate an error buzz
    generateErrorSound().then(url => {
      if (accessDeniedAudio) accessDeniedAudio.src = url;
    });
  }
}

/**
 * Generate a pleasant success beep (two-tone ascending)
 */
async function generateSuccessSound(): Promise<string> {
  const audioContext = new AudioContext();
  const sampleRate = audioContext.sampleRate;
  const duration = 0.3; // 300ms
  const length = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // First tone: 800Hz for 0.15s
  for (let i = 0; i < length / 2; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * 800 * t) * 0.3 * Math.exp(-t * 3);
  }

  // Second tone: 1000Hz for 0.15s
  for (let i = Math.floor(length / 2); i < length; i++) {
    const t = (i - length / 2) / sampleRate;
    data[i] = Math.sin(2 * Math.PI * 1000 * t) * 0.3 * Math.exp(-t * 3);
  }

  return bufferToWav(buffer);
}

/**
 * Generate an error buzz (low frequency)
 */
async function generateErrorSound(): Promise<string> {
  const audioContext = new AudioContext();
  const sampleRate = audioContext.sampleRate;
  const duration = 0.5; // 500ms
  const length = sampleRate * duration;
  const buffer = audioContext.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Low buzz: 200Hz
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * 200 * t) * 0.4 * Math.exp(-t * 2);
  }

  return bufferToWav(buffer);
}

/**
 * Convert AudioBuffer to WAV data URL
 */
function bufferToWav(buffer: AudioBuffer): string {
  const length = buffer.length * buffer.numberOfChannels * 2 + 44;
  const arrayBuffer = new ArrayBuffer(length);
  const view = new DataView(arrayBuffer);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // Write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(buffer.numberOfChannels);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * buffer.numberOfChannels); // avg. bytes/sec
  setUint16(buffer.numberOfChannels * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length

  // Write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < buffer.numberOfChannels; i++) {
      const sample = Math.max(-1, Math.min(1, channels[i][offset]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
    offset++;
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // Convert to base64 data URL
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return 'data:audio/wav;base64,' + btoa(binary);
}

/**
 * Play success sound (access granted)
 */
export function playAccessGranted() {
  initAudio();
  if (accessGrantedAudio) {
    accessGrantedAudio.currentTime = 0;
    accessGrantedAudio.volume = 0.5;
    accessGrantedAudio.play().catch(err => {
      console.warn('Could not play success sound:', err);
    });
  }
}

/**
 * Play error sound (access denied)
 */
export function playAccessDenied() {
  initAudio();
  if (accessDeniedAudio) {
    accessDeniedAudio.currentTime = 0;
    accessDeniedAudio.volume = 0.5;
    accessDeniedAudio.play().catch(err => {
      console.warn('Could not play error sound:', err);
    });
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initAudio();
}
