import { saveData, writeSave } from './state.js';

let context = null;
let musicTimer = null;
let step = 0;
let currentTheme = 'grid';

function ensureContext() {
  if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
  if (context.state === 'suspended') context.resume();
  return context;
}

function gain(value) {
  return Math.max(0, Math.min(1, value * saveData.settings.master));
}

function tone(frequency, duration, volume, type = 'sine', slide = null) {
  if (!gain(volume)) return;
  const audio = ensureContext();
  const oscillator = audio.createOscillator();
  const output = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, slide), audio.currentTime + duration);
  output.gain.setValueAtTime(.0001, audio.currentTime);
  output.gain.exponentialRampToValueAtTime(gain(volume), audio.currentTime + .01);
  output.gain.exponentialRampToValueAtTime(.0001, audio.currentTime + duration);
  oscillator.connect(output).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration + .03);
}

export function unlockAudio() { ensureContext(); }

export function playSound(name) {
  const volume = saveData.settings.sfx;
  if (!volume) return;
  const table = {
    shot: () => tone(430, .055, .11 * volume, 'square', 260),
    hit: () => tone(680, .05, .09 * volume, 'triangle', 420),
    crit: () => { tone(910, .08, .14 * volume, 'triangle', 1320); tone(1240, .11, .08 * volume, 'sine'); },
    hurt: () => tone(150, .18, .18 * volume, 'sawtooth', 90),
    dash: () => tone(260, .18, .14 * volume, 'sawtooth', 840),
    skill: () => tone(520, .16, .13 * volume, 'sine', 980),
    pickup: () => tone(780, .11, .1 * volume, 'triangle', 1220),
    upgrade: () => { tone(480, .12, .12 * volume, 'sine', 720); tone(720, .22, .1 * volume, 'sine', 1080); },
    boss: () => tone(100, .45, .25 * volume, 'sawtooth', 48),
    bossWin: () => { tone(330, .18, .16 * volume, 'triangle', 660); tone(660, .34, .16 * volume, 'triangle', 1040); },
    purchase: () => tone(610, .1, .1 * volume, 'square', 840)
  };
  if (table[name]) table[name]();
}

function noteForTheme(theme, index) {
  const scales = {
    grid: [220, 277, 330, 415, 330, 277],
    data: [196, 247, 294, 370, 294, 247],
    crystal: [174, 220, 262, 349, 294, 220]
  };
  return (scales[theme] || scales.grid)[index % 6];
}

export function setMusicTheme(theme) {
  currentTheme = theme || 'grid';
  step = 0;
  if (!musicTimer) {
    musicTimer = window.setInterval(() => {
      if (!context || context.state !== 'running' || !saveData.settings.music) return;
      const n = noteForTheme(currentTheme, step++);
      tone(n, .34, .045 * saveData.settings.music, step % 4 === 0 ? 'triangle' : 'sine');
      if (step % 2 === 0) tone(n / 2, .2, .022 * saveData.settings.music, 'sine');
    }, 370);
  }
}

export function updateAudioSettings(partial) {
  Object.assign(saveData.settings, partial);
  writeSave();
}
