/**
 * Spellcasters' Arena: Core Game Engine, Physics, Bot AI, Sound, and Render Loop
 */

// Web Audio API Synthesizer for high-quality game audio without assets
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  playCast() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  }

  playHit() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.11);
  }

  playExplosion() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    
    const bufferSize = ctx.sampleRate * 0.35;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.3);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  playHeal() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
      
      gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + index * 0.08 + 0.2);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + index * 0.08);
      osc.stop(ctx.currentTime + index * 0.08 + 0.25);
    });
  }

  playLightning() {
    if (this.muted) return;
    this.init();
    const ctx = this.ctx;
    
    const duration = 0.55;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.2 ? 1 : 0.25);
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();

    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.type = 'sawtooth';
    rumble.frequency.setValueAtTime(70, ctx.currentTime);
    rumble.frequency.linearRampToValueAtTime(25, ctx.currentTime + duration);
    
    rumbleGain.gain.setValueAtTime(0.4, ctx.currentTime);
    rumbleGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 120;
    
    rumble.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(ctx.destination);
    
    rumble.start();
    rumble.stop(ctx.currentTime + duration);
  }
}

// Spell Configuration Definitions for All 7 Elements
const ElementSpells = {
  fire: {
    1: { name: 'Fireball', type: 'projectile', speed: 9.5, radius: 9, damage: 18, cooldown: 50, manaCost: 15, color: '#ff4500', desc: 'Launch a quick fire projectile.' },
    2: { name: 'Flame Breath', type: 'projectile', speed: 8.0, radius: 14, damage: 22, cooldown: 120, manaCost: 25, color: '#ff7700', desc: 'Slow but wide flame burst.' },
    3: { name: 'Magma Eruption', type: 'targeted', radius: 60, delay: 30, damage: 28, stunDuration: 30, cooldown: 240, manaCost: 35, color: '#ff3300', desc: 'Erupt magma at target area.' },
    4: { name: 'Meteor Strike', type: 'targeted', radius: 80, delay: 45, damage: 38, stunDuration: 45, cooldown: 360, manaCost: 50, color: '#e62e00', desc: 'Summon a huge meteor strike.' },
    5: { name: 'Fire Shield', type: 'shield', duration: 300, maxShield: 50, cooldown: 180, manaCost: 20, color: '#ff5500', desc: 'Fire barrier absorbing damage.' }
  },
  ice: {
    1: { name: 'Ice Shard', type: 'projectile', speed: 10.0, radius: 7, damage: 14, cooldown: 40, manaCost: 12, color: '#aaddff', desc: 'Fast freezing shard.' },
    2: { name: 'Frost Nova', type: 'targeted', radius: 50, delay: 24, damage: 16, stunDuration: 60, cooldown: 150, manaCost: 22, color: '#00ccff', desc: 'Freeze enemies in target area.' },
    3: { name: 'Icicle Lance', type: 'projectile', speed: 12.0, radius: 11, damage: 25, cooldown: 220, manaCost: 30, color: '#00aaff', desc: 'Heavy ice lance projectile.' },
    4: { name: 'Blizzard', type: 'targeted', radius: 75, delay: 40, damage: 32, stunDuration: 80, cooldown: 340, manaCost: 45, color: '#ffffff', desc: 'Summon a freezing blizzard.' },
    5: { name: 'Frost Barrier', type: 'shield', duration: 300, maxShield: 50, cooldown: 180, manaCost: 20, color: '#00ccff', desc: 'Frost barrier absorbing damage.' }
  },
  lightning: {
    1: { name: 'Spark Volt', type: 'projectile', speed: 13.0, radius: 6, damage: 12, cooldown: 30, manaCost: 10, color: '#ffe600', desc: 'Extremely fast electrical spark.' },
    2: { name: 'Static Burst', type: 'targeted', radius: 45, delay: 18, damage: 18, stunDuration: 40, cooldown: 130, manaCost: 20, color: '#ffffaa', desc: 'Quick static shock targeted.' },
    3: { name: 'Chain Discharge', type: 'projectile', speed: 11.0, radius: 10, damage: 26, cooldown: 200, manaCost: 28, color: '#ffd700', desc: 'Heavy electrical blast.' },
    4: { name: 'Thunderbolt', type: 'targeted', radius: 55, delay: 36, damage: 35, stunDuration: 90, cooldown: 350, manaCost: 40, color: '#ffe600', desc: 'Call down a stunning thunderbolt.' },
    5: { name: 'Faraday Shield', type: 'shield', duration: 300, maxShield: 50, cooldown: 180, manaCost: 20, color: '#ffcc00', desc: 'Electric shield absorbing damage.' }
  },
  earth: {
    1: { name: 'Stone Pebble', type: 'projectile', speed: 8.5, radius: 11, damage: 16, cooldown: 55, manaCost: 14, color: '#8b5a2b', desc: 'Heavy rock projectile.' },
    2: { name: 'Tectonic Spike', type: 'targeted', radius: 50, delay: 28, damage: 20, stunDuration: 45, cooldown: 160, manaCost: 24, color: '#6e473b', desc: 'Summon spikes from ground.' },
    3: { name: 'Boulder Toss', type: 'projectile', speed: 7.5, radius: 16, damage: 30, cooldown: 260, manaCost: 35, color: '#5c4033', desc: 'Giant slow boulder toss.' },
    4: { name: 'Earthquake', type: 'targeted', radius: 70, delay: 42, damage: 34, stunDuration: 75, cooldown: 380, manaCost: 45, color: '#9c6644', desc: 'Slam ground to damage and stun.' },
    5: { name: 'Rock Armor', type: 'shield', duration: 300, maxShield: 50, cooldown: 180, manaCost: 20, color: '#39ff14', desc: 'Rock armor absorbing damage.' }
  },
  water: {
    1: { name: 'Aqua Spray', type: 'projectile', speed: 9.8, radius: 8, damage: 13, cooldown: 35, manaCost: 11, color: '#00bfff', desc: 'Fast water jet projectile.' },
    2: { name: 'Geyser Rise', type: 'targeted', radius: 50, delay: 26, damage: 21, stunDuration: 50, cooldown: 140, manaCost: 22, color: '#3399ff', desc: 'Erupt geyser at target area.' },
    3: { name: 'Torrent Bubble', type: 'projectile', speed: 9.0, radius: 12, damage: 24, cooldown: 210, manaCost: 28, color: '#0055ff', desc: 'Heavy water bubble projectile.' },
    4: { name: 'Maelstrom', type: 'targeted', radius: 65, delay: 35, damage: 33, stunDuration: 70, cooldown: 330, manaCost: 40, color: '#0044cc', desc: 'Create a swirling whirlpool.' },
    5: { name: 'Water Veil', type: 'shield', duration: 300, maxShield: 50, cooldown: 180, manaCost: 20, color: '#00aaff', desc: 'Flowing water shield.' }
  },
  wind: {
    1: { name: 'Wind Gust', type: 'projectile', speed: 11.5, radius: 7, damage: 11, cooldown: 25, manaCost: 9, color: '#e0e0e0', desc: 'Quick wind slice.' },
    2: { name: 'Vortex Trap', type: 'targeted', radius: 48, delay: 20, damage: 17, stunDuration: 50, cooldown: 120, manaCost: 18, color: '#f0f0f0', desc: 'Trap enemy in wind vortex.' },
    3: { name: 'Air Cutter', type: 'projectile', speed: 10.5, radius: 11, damage: 23, cooldown: 180, manaCost: 26, color: '#d8d8d8', desc: 'Sharp gale cutter projectile.' },
    4: { name: 'Tornado Blast', type: 'targeted', radius: 60, delay: 32, damage: 30, stunDuration: 80, cooldown: 310, manaCost: 38, color: '#c0c0c0', desc: 'Spawn stunning tornado.' },
    5: { name: 'Wind Barrier', type: 'shield', duration: 300, maxShield: 50, cooldown: 180, manaCost: 20, color: '#ffffff', desc: 'Swirling gale shield.' }
  },
  necromancer: {
    1: { name: 'Death Coil', type: 'projectile', speed: 10.0, radius: 9, damage: 15, cooldown: 45, manaCost: 12, color: '#2e8b57', desc: 'Siphon life from target.' },
    2: { name: 'Bone Spear', type: 'projectile', speed: 13.0, radius: 6, damage: 20, cooldown: 110, manaCost: 20, color: '#d3d3d3', desc: 'Fast bone spear that breaks crates.' },
    3: { name: 'Decay Zone', type: 'targeted', radius: 55, delay: 26, damage: 18, stunDuration: 40, cooldown: 200, manaCost: 25, color: '#556b2f', desc: 'Decay area draining mana.' },
    4: { name: 'Raise Skeleton', type: 'targeted', radius: 60, delay: 35, damage: 26, stunDuration: 50, cooldown: 320, manaCost: 40, color: '#f5f5dc', desc: 'Summon skeleton chasing target.' },
    5: { name: 'Bone Shield', type: 'shield', duration: 300, maxShield: 50, cooldown: 180, manaCost: 20, color: '#8fbc8f', desc: 'Ribcage shield absorbing damage.' }
  }
};


class GameEngine {
  constructor() {
    this.canvas = document.getElementById('arena-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    // Screens
    this.authScreen = document.getElementById('auth-screen');
    this.lobbyScreen = document.getElementById('lobby-screen');
    this.arenaScreen = document.getElementById('arena-screen');
    this.summaryScreen = document.getElementById('summary-screen');
    
    // Particle Engine
    this.fx = new ParticleSystem();
    
    // Audio Synthesizer
    this.sound = new SoundSynth();
    
    // Game mode state
    this.isBotMode = false;
    
    // Bot difficulty & Map hazards settings
    this.botDifficulty = 'medium';
    this.activeMap = 'random';
    this.currentBattleMap = 'magma';
    this.mapEffectTimer = 0;
    this.lavaPools = [];
    this.stormStrikes = [];
    this.blizzardActive = false;
    this.blizzardTimer = 0;
    
    // Clones system (Necromancer passive)
    this.clones = [];

    // Game state tracking
    this.roundState = 'WAITING'; // WAITING, COUNTDOWN, PLAYING, ROUND_OVER
    this.roundTimer = 90; // seconds (synced dynamically)
    this.timerInterval = null;
    this.roundWinner = null;
    
    // Arena boundaries
    this.bounds = {
      xMin: 40,
      xMax: this.canvas.width - 40,
      yMin: 40,
      yMax: this.canvas.height - 40
    };

    // Game stats
    this.stats = {
      damageDealt: 0,
      spellsCast: 0,
      blocksCount: 0
    };

    // Client/Host game objects
    this.players = {
      host: this.createWizard(200, this.canvas.height / 2, 'Host', '#00f3ff'),
      client: this.createWizard(this.canvas.width - 200, this.canvas.height / 2, 'Client', '#ff007b')
    };

    this.projectiles = [];
    this.thunderbolts = [];
    this.activeBolts = []; // Holds current visual jagged lightning structures
    this.blocks = []; // Decaying obstacle block wall segments

    // Inputs
    this.localKeys = {};
    this.mousePos = { x: 0, y: 0 };
    this.selectedSpell = 1;

    // Chat macros
    this.chatBox = document.getElementById('quick-chat-panel');
    this.chatToggle = document.getElementById('btn-chat-toggle');
    this.activeChats = [];

    this.setupUI();
    this.setupInput();
    this.setupNetwork();
  }

  createWizard(x, y, name, color) {
    return {
      x: x,
      y: y,
      radius: 20,
      vx: 0,
      vy: 0,
      speed: 4.2,
      health: 100,
      maxHealth: 100,
      mana: 100,
      maxMana: 100,
      manaRegen: 0.16,
      color: color,
      name: name,
      element: 'fire',
      potionsLeft: 2,
      wallsLeft: 1,
      level: 1,
      successfulHits: 0,
      
      // Cooldowns
      cooldowns: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 },
      
      // Buffs & Flashes
      stun: 0,
      shield: 0,
      shieldDuration: 0,
      healDuration: 0,
      hitFlash: 0, // Frame count for damage flash
      
      // Stats tracking
      spellsCast: 0,
      damageDealt: 0,
      blocksCount: 0
    };
  }

  setupUI() {
    // Auth Tab Toggling
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const authSubmitBtn = document.getElementById('btn-auth-submit');
    const authError = document.getElementById('auth-error');

    if (tabLogin && tabSignup) {
      tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        authSubmitBtn.textContent = 'Enter Arena';
        authError.textContent = '';
      });
      tabSignup.addEventListener('click', () => {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        authSubmitBtn.textContent = 'Create Wizard Account';
        authError.textContent = '';
      });
    }

    // Auth Form Submission
    const authForm = document.getElementById('auth-form');
    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-username').value;
        const password = document.getElementById('auth-password').value;
        const isLogin = tabLogin.classList.contains('active');
        
        authError.style.color = '#ff3b30';
        authError.textContent = 'Accessing archives...';
        
        try {
          if (isLogin) {
            await window.dbManager.login(username, password);
          } else {
            await window.dbManager.register(username, password);
          }
          
          // Switch Screen
          this.authScreen.classList.remove('active');
          this.lobbyScreen.classList.add('active');
          
          // Load Profile Stats
          this.updateDashboardUI();
          this.checkNecromancerUnlock();
          this.updateLeaderboardUI();
          
          // Load Customizations
          window.networkManager.loadCustomization();
        } catch (err) {
          authError.textContent = err.message;
        }
      });
    }

    // Wizard upgrades click handling
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent selecting class card
        const element = e.target.getAttribute('data-element');
        this.upgradeWizard(element);
      });
    });

    // Map hazard selector
    const mapSelect = document.getElementById('map-selector');
    if (mapSelect) {
      mapSelect.addEventListener('change', () => {
        this.activeMap = mapSelect.value;
        window.networkManager.saveCustomization();
      });
    }

    // Bot difficulty selector
    const diffSelect = document.getElementById('bot-difficulty');
    if (diffSelect) {
      diffSelect.addEventListener('change', () => {
        this.botDifficulty = diffSelect.value;
      });
    }

    // Suggestions Box submission
    const suggestForm = document.getElementById('suggestion-form');
    if (suggestForm) {
      suggestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rating = document.getElementById('suggest-rating').value;
        const text = document.getElementById('suggest-text').value;
        const statusEl = document.getElementById('suggestion-status');
        
        statusEl.style.color = '#ffb700';
        statusEl.textContent = 'Casting suggestion spell...';
        
        try {
          const response = await fetch('https://formsubmit.co/ajax/kartiikeya@outlook.in', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              username: window.dbManager.currentUser ? window.dbManager.currentUser.username : 'Anonymous',
              rating: rating,
              suggestion: text
            })
          });
          
          if (response.ok) {
            statusEl.style.color = '#39ff14';
            statusEl.textContent = 'Suggestion sent successfully! Thank you!';
            document.getElementById('suggest-text').value = '';
          } else {
            statusEl.style.color = '#ff3b30';
            statusEl.textContent = 'Failed to submit. Try again later.';
          }
        } catch (err) {
          statusEl.style.color = '#ff3b30';
          statusEl.textContent = 'Network offline, could not send.';
        }
      });
    }

    const durationSelect = document.getElementById('match-duration');
    if (durationSelect) {
      durationSelect.addEventListener('change', () => {
        window.networkManager.saveCustomization();
      });
    }

    this.chatToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      this.chatBox.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      this.chatBox.classList.add('hidden');
    });

    document.querySelectorAll('.chat-macro').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const msg = e.target.getAttribute('data-msg');
        this.sendChatMessage(msg);
      });
    });

    document.querySelectorAll('.spell-slot').forEach(slot => {
      slot.addEventListener('click', (e) => {
        const key = parseInt(e.currentTarget.getAttribute('data-key'));
        this.selectedSpell = key;
        this.updateSpellUI();
      });
    });

    // Return to Lobby reset
    document.getElementById('btn-summary-lobby').addEventListener('click', () => {
      window.networkManager.disconnect();
      this.isBotMode = false;
      this.lobbyScreen.classList.add('active');
      this.arenaScreen.classList.remove('active');
      this.summaryScreen.classList.remove('active');
      this.roundState = 'WAITING';
      this.updateLeaderboardUI(); // refresh on return
    });

    // Rematch button
    document.getElementById('btn-rematch').addEventListener('click', () => {
      document.getElementById('btn-rematch').disabled = true;
      if (this.isBotMode) {
        document.getElementById('rematch-status').textContent = '';
        document.getElementById('btn-rematch').disabled = false;
        this.summaryScreen.classList.remove('active');
        this.startMatchCountdown();
      } else {
        document.getElementById('rematch-status').textContent = 'Waiting for opponent to accept rematch...';
        window.networkManager.send('rematch_request');
      }
    });
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      this.localKeys[e.key.toLowerCase()] = true;
      
      if (['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
        this.selectedSpell = parseInt(e.key);
        this.updateSpellUI();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.localKeys[e.key.toLowerCase()] = false;
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.mousePos.x = (e.clientX - rect.left) * scaleX;
      this.mousePos.y = (e.clientY - rect.top) * scaleY;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.roundState === 'PLAYING') {
        this.castSpellLocal();
      }
    });
  }

  // --- Database Stats & Upgrades Helpers ---

  updateDashboardUI() {
    if (!window.dbManager.currentUser) return;
    const user = window.dbManager.currentUser;
    
    document.getElementById('lbl-username').textContent = user.username;
    document.getElementById('lbl-coins').textContent = Math.round(user.coins);
    document.getElementById('lbl-profile-level').textContent = user.level;
    document.getElementById('lbl-wins-bot').textContent = user.winsBot || 0;
    document.getElementById('lbl-wins-player').textContent = user.winsPlayer || 0;
    
    // EXP Bar updates
    document.getElementById('lbl-exp-text').textContent = `${user.exp} / 100`;
    document.getElementById('lbl-exp-fill').style.width = `${Math.min(100, user.exp)}%`;

    // Wizard levels text and upgrade buttons cost updates
    const elements = ['fire', 'ice', 'lightning', 'earth', 'water', 'wind', 'necromancer'];
    elements.forEach(elem => {
      const lvl = user.wizardLevels[elem] || 1;
      const lvlTextEl = document.getElementById(`lvl-${elem}`);
      const upgradeBtnEl = document.getElementById(`btn-upgrade-${elem}`);
      
      if (lvlTextEl) lvlTextEl.textContent = `Lvl ${lvl}`;
      
      if (upgradeBtnEl) {
        if (lvl >= 7) {
          upgradeBtnEl.textContent = 'MAX';
          upgradeBtnEl.setAttribute('disabled', 'true');
        } else {
          const cost = 200 * Math.pow(2, lvl - 1);
          upgradeBtnEl.textContent = `Upgrade (${cost} 🪙)`;
          if (user.coins < cost) {
            upgradeBtnEl.setAttribute('disabled', 'true');
          } else {
            upgradeBtnEl.removeAttribute('disabled');
          }
        }
      }
    });

    this.checkNecromancerUnlock();
  }

  checkNecromancerUnlock() {
    if (!window.dbManager.currentUser) return;
    const user = window.dbManager.currentUser;
    
    const lvlMet = user.level >= 5;
    const impossibleWins = (user.difficultyWins && user.difficultyWins.impossible) || 0;
    const hardWins = (user.difficultyWins && user.difficultyWins.hard) || 0;
    const winsMet = impossibleWins >= 3 || hardWins >= 5;
    const isUnlocked = (user.username.toLowerCase() === '_rebelsoulz') || (lvlMet && winsMet);
    
    const necroCard = document.getElementById('card-necromancer');
    const necroBtn = necroCard ? necroCard.querySelector('.element-btn') : null;
    const necroUpgradeBtn = document.getElementById('btn-upgrade-necromancer');
    
    if (necroCard) {
      if (isUnlocked) {
        necroCard.classList.remove('locked');
        if (necroBtn) necroBtn.removeAttribute('disabled');
        if (necroUpgradeBtn && (user.wizardLevels.necromancer || 1) < 7) necroUpgradeBtn.removeAttribute('disabled');
      } else {
        necroCard.classList.add('locked');
        if (necroBtn) necroBtn.setAttribute('disabled', 'true');
        if (necroUpgradeBtn) necroUpgradeBtn.setAttribute('disabled', 'true');
        
        const lockMsg = document.getElementById('necro-lock-msg');
        if (lockMsg) {
          lockMsg.textContent = `Req: Profile Lvl 5 & 3 Impossible / 5 Hard Wins (You: Lvl ${user.level}, ${impossibleWins} Imp / ${hardWins} Hard wins)`;
        }
      }
    }
  }

  async upgradeWizard(element) {
    if (!window.dbManager.currentUser) return;
    const user = window.dbManager.currentUser;
    
    const lvl = user.wizardLevels[element] || 1;
    if (lvl >= 7) return;
    
    const cost = 200 * Math.pow(2, lvl - 1);
    if (user.coins >= cost) {
      user.coins -= cost;
      user.wizardLevels[element] = lvl + 1;
      
      // Save changes
      await window.dbManager.saveProfile();
      this.sound.playHeal(); // success audio feedback
      
      // Update UI
      this.updateDashboardUI();
    }
  }

  async updateLeaderboardUI() {
    const listBody = document.getElementById('leaderboard-body');
    if (!listBody) return;
    
    try {
      const topPlayers = await window.dbManager.getLeaderboard();
      listBody.innerHTML = '';
      
      topPlayers.forEach((player, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td><strong>${player.username}</strong></td>
          <td>${player.wins}</td>
          <td>Lvl ${player.level}</td>
          <td>🪙 ${player.coins}</td>
        `;
        listBody.appendChild(row);
      });
    } catch (e) {
      listBody.innerHTML = '<tr><td colspan="5">Leaderboard offline.</td></tr>';
    }
  }

  formatClassName(element) {
    if (element === 'wind') return 'TEMPEST WIZARD';
    if (element === 'lightning') return 'ELECTROMANCER';
    if (element === 'ice') return 'CRYOMANCER';
    if (element === 'earth') return 'GEOMANCER';
    if (element === 'water') return 'HYDROMANCER';
    if (element === 'necromancer') return 'NECROMANCER';
    return 'PYROMANCER';
  }

  updateSpellUI() {
    document.querySelectorAll('.spell-slot').forEach(slot => {
      slot.classList.remove('selected');
      if (parseInt(slot.getAttribute('data-key')) === this.selectedSpell) {
        slot.classList.add('selected');
      }
    });
  }

  rebuildSpellSlotsUI(element) {
    const spells = ElementSpells[element];
    if (!spells) return;
    
    // Elements color maps for dynamic tooltips styling
    const elementColors = {
      fire: '#ff4500',
      ice: '#00ccff',
      lightning: '#ffe600',
      earth: '#39ff14',
      water: '#3399ff',
      wind: '#ffffff',
      necromancer: '#2e8b57'
    };

    for (let slotKey = 1; slotKey <= 5; slotKey++) {
      const spell = spells[slotKey];
      const iconEl = document.getElementById(`icon-${slotKey}`);
      const tooltipEl = document.getElementById(`tooltip-${slotKey}`);
      
      let emoji = '🔥';
      if (element === 'ice') emoji = '❄️';
      else if (element === 'lightning') emoji = '⚡';
      else if (element === 'earth') emoji = '🍃';
      else if (element === 'water') emoji = '🌊';
      else if (element === 'wind') emoji = '🌪️';
      else if (element === 'necromancer') emoji = '💀';
      
      if (slotKey === 5) emoji = '🛡️'; // Shield
      
      if (iconEl) iconEl.textContent = emoji;
      if (tooltipEl) {
        tooltipEl.querySelector('h4').textContent = spell.name;
        tooltipEl.querySelector('h4').style.color = elementColors[element] || '#ffffff';
        tooltipEl.querySelector('p').textContent = spell.desc;
        tooltipEl.querySelector('small').textContent = `Cooldown: ${(spell.cooldown / 60).toFixed(1)}s | Mana: ${spell.manaCost}`;
      }
    }
  }

  setupNetwork() {
    window.networkManager.registerOnConnected(() => {
      console.log("Online game joined!");
      this.isBotMode = false;
      this.sound.init();
      
      const myConfig = window.networkManager.getCustomization();
      this.rebuildSpellSlotsUI(myConfig.element);
      
      this.lobbyScreen.classList.remove('active');
      this.summaryScreen.classList.remove('active');
      this.arenaScreen.classList.add('active');
      
      this.stats.damageDealt = 0;
      this.stats.spellsCast = 0;
      this.stats.blocksCount = 0;

      document.getElementById('btn-rematch').disabled = false;
      document.getElementById('rematch-status').textContent = '';

      if (window.networkManager.isHost) {
        this.players.host.name = myConfig.name;
        this.players.host.color = myConfig.color;
        this.players.host.element = myConfig.element;
        
        document.getElementById('p1-name').textContent = myConfig.name;
        document.getElementById('p1-class').textContent = this.formatClassName(myConfig.element);
        
        // Host match duration settings
        const durationSelect = document.getElementById('match-duration');
        const dur = durationSelect ? parseInt(durationSelect.value) : 90;
        this.roundTimer = dur;
      } else {
        this.players.client.name = myConfig.name;
        this.players.client.color = myConfig.color;
        this.players.client.element = myConfig.element;

        document.getElementById('p2-name').textContent = myConfig.name;
        document.getElementById('p2-class').textContent = this.formatClassName(myConfig.element);
      }

      this.activeChats = [];
      this.projectiles = [];
      this.thunderbolts = [];
      this.activeBolts = [];
      this.blocks = [];
      
      if (window.networkManager.isHost) {
        this.startMatchCountdown();
      }

      this.startGameLoop();
    });

    window.networkManager.registerOnDisconnected(() => {
      this.stopTimer();
      this.isBotMode = false;
      this.lobbyScreen.classList.add('active');
      this.arenaScreen.classList.remove('active');
      this.summaryScreen.classList.remove('active');
      this.roundState = 'WAITING';
    });

    window.networkManager.registerOnData((packet) => {
      this.handleNetworkPacket(packet);
    });
  }

  // --- VS Bot Game Trigger ---

  startBotMode() {
    this.isBotMode = true;
    window.networkManager.isConnected = true; // bypass checks
    window.networkManager.isHost = true;
    this.sound.init();

    const myConfig = window.networkManager.getCustomization();
    this.players.host.name = myConfig.name;
    this.players.host.color = myConfig.color;
    this.players.host.element = myConfig.element;
    this.rebuildSpellSlotsUI(myConfig.element);

    const botColors = ['#ff007b', '#ffb700', '#39ff14', '#9d00ff', '#0077ff', '#e0e0e0', '#2e8b57'];
    const botElements = ['fire', 'ice', 'lightning', 'earth', 'water', 'wind', 'necromancer'];
    const randomColor = botColors[Math.floor(Math.random() * botColors.length)];
    const randomElement = botElements[Math.floor(Math.random() * botElements.length)];

    this.players.client.name = 'Bot Ignis';
    this.players.client.color = randomColor;
    this.players.client.element = randomElement;

    this.lobbyScreen.classList.remove('active');
    this.summaryScreen.classList.remove('active');
    this.arenaScreen.classList.add('active');

    document.getElementById('p1-name').textContent = myConfig.name;
    document.getElementById('p1-class').textContent = this.formatClassName(myConfig.element);
    
    document.getElementById('p2-name').textContent = 'Bot Ignis';
    document.getElementById('p2-class').textContent = this.formatClassName(randomElement);
    
    document.getElementById('ping-text').textContent = 'Ping: 0 ms (Offline)';

    this.stats.damageDealt = 0;
    this.stats.spellsCast = 0;
    this.stats.blocksCount = 0;

    this.activeChats = [];
    this.projectiles = [];
    this.thunderbolts = [];
    this.activeBolts = [];
    this.blocks = [];

    const durationSelect = document.getElementById('match-duration');
    const dur = durationSelect ? parseInt(durationSelect.value) : 90;
    this.roundTimer = dur;

    document.getElementById('btn-rematch').disabled = false;
    document.getElementById('rematch-status').textContent = '';

    this.startMatchCountdown();
    this.startGameLoop();
  }

  // --- Bot AI Controller logic ---

  getBotDifficultyParams() {
    switch (this.botDifficulty) {
      case 'easy':
        return { speedMult: 0.6, castChance1: 0.012, castChance234: 0.005, dodgeChance: 0.2, inaccuracy: 80, healthThreshold: 30 };
      case 'medium':
        return { speedMult: 0.85, castChance1: 0.025, castChance234: 0.012, dodgeChance: 0.5, inaccuracy: 45, healthThreshold: 40 };
      case 'hard':
        return { speedMult: 1.0, castChance1: 0.04, castChance234: 0.02, dodgeChance: 0.75, inaccuracy: 20, healthThreshold: 50 };
      case 'impossible':
      default:
        return { speedMult: 1.2, castChance1: 0.06, castChance234: 0.04, dodgeChance: 1.0, inaccuracy: 5, healthThreshold: 60 };
    }
  }

  updateBotAI() {
    const bot = this.players.client;
    const opponent = this.players.host;
    const diff = this.getBotDifficultyParams();

    if (bot.health <= 0 || bot.stun > 0 || this.roundState !== 'PLAYING') {
      bot.vx = 0;
      bot.vy = 0;
      return;
    }

    // 1. Dodging incoming projectiles (difficulty-gated)
    let dodgeX = 0;
    let dodgeY = 0;
    let isProjectilesClose = false;

    for (let proj of this.projectiles) {
      if (proj.owner === 'host') {
        const dist = Math.hypot(proj.x - bot.x, proj.y - bot.y);
        if (dist < 180) {
          isProjectilesClose = true;
          if (Math.random() < diff.dodgeChance) {
            const pAngle = Math.atan2(proj.vy, proj.vx);
            const perpAngle = pAngle + Math.PI / 2;
            dodgeX += Math.cos(perpAngle);
            dodgeY += Math.sin(perpAngle);
          }
        }
      }
    }

    // 2. Position control relative to player
    const distToOpponent = Math.hypot(opponent.x - bot.x, opponent.y - bot.y);
    const targetDist = 260;
    let moveX = 0;
    let moveY = 0;

    if (!isProjectilesClose || diff.dodgeChance < 0.5) {
      if (distToOpponent > targetDist + 50) {
        moveX = (opponent.x - bot.x) / distToOpponent;
        moveY = (opponent.y - bot.y) / distToOpponent;
      } else if (distToOpponent < targetDist - 50) {
        moveX = -(opponent.x - bot.x) / distToOpponent;
        moveY = -(opponent.y - bot.y) / distToOpponent;
      } else {
        // Orbit
        const angle = Math.atan2(bot.y - opponent.y, bot.x - opponent.x);
        const orbitAngle = angle + 0.35;
        const tx = opponent.x + Math.cos(orbitAngle) * targetDist;
        const ty = opponent.y + Math.sin(orbitAngle) * targetDist;
        moveX = (tx - bot.x) / 30;
        moveY = (ty - bot.y) / 30;
      }
    } else {
      const dLength = Math.hypot(dodgeX, dodgeY) || 1;
      moveX = dodgeX / dLength;
      moveY = dodgeY / dLength;
    }

    bot.vx = moveX * bot.speed * diff.speedMult;
    bot.vy = moveY * bot.speed * diff.speedMult;

    // 3. Spellcasting heuristics (difficulty-gated)
    const botSpells = ElementSpells[bot.element];

    // Potions heal
    if (bot.health < diff.healthThreshold && bot.potionsLeft > 0 && bot.cooldowns[6] === 0) {
      this.castSpellAuthoritative('client', 6, { x: bot.x, y: bot.y });
    }
    // Shield Defense
    else if (isProjectilesClose && bot.cooldowns[5] === 0 && bot.mana >= botSpells[5].manaCost && bot.shield <= 0 && Math.random() < diff.dodgeChance) {
      this.castSpellAuthoritative('client', 5, { x: bot.x, y: bot.y });
    }
    // Spawn Crate wall
    else if (bot.wallsLeft > 0 && bot.cooldowns[7] === 0 && Math.random() < diff.castChance234 * 0.5) {
      this.castSpellAuthoritative('client', 7, { x: opponent.x, y: opponent.y });
    }
    // High-tier attack
    else if (bot.cooldowns[4] === 0 && bot.mana >= botSpells[4].manaCost && Math.random() < diff.castChance234) {
      const leadX = opponent.x + opponent.vx * 20;
      const leadY = opponent.y + opponent.vy * 20;
      this.castSpellAuthoritative('client', 4, { x: leadX, y: leadY });
    }
    // Medium-tier attacks
    else if (bot.cooldowns[3] === 0 && bot.mana >= botSpells[3].manaCost && Math.random() < diff.castChance234) {
      const leadX = opponent.x + opponent.vx * 15;
      const leadY = opponent.y + opponent.vy * 15;
      this.castSpellAuthoritative('client', 3, { x: leadX, y: leadY });
    }
    else if (bot.cooldowns[2] === 0 && bot.mana >= botSpells[2].manaCost && Math.random() < diff.castChance234) {
      this.castSpellAuthoritative('client', 2, { x: opponent.x, y: opponent.y });
    }
    else if (bot.cooldowns[1] === 0 && bot.mana >= botSpells[1].manaCost && Math.random() < diff.castChance1) {
      const inaccuracy = (Math.random() - 0.5) * diff.inaccuracy;
      const leadFactor = this.botDifficulty === 'impossible' ? 12 : (this.botDifficulty === 'hard' ? 8 : 3);
      this.castSpellAuthoritative('client', 1, {
        x: opponent.x + opponent.vx * leadFactor + inaccuracy,
        y: opponent.y + opponent.vy * leadFactor + inaccuracy
      });
      
      if (Math.random() < 0.08) {
        const chats = ['Nice shot!', 'GG!', 'Oops...', 'Let\'s go!'];
        this.addChatBubble('client', chats[Math.floor(Math.random() * chats.length)]);
      }
    }
  }

  // --- Messaging bubbles ---

  sendChatMessage(msg) {
    const isHost = window.networkManager.isHost;
    this.addChatBubble(isHost ? 'host' : 'client', msg);
    if (!this.isBotMode) {
      window.networkManager.send('chat', { text: msg });
    }
  }

  addChatBubble(wizardId, msg) {
    this.activeChats.push({
      target: wizardId,
      text: msg,
      life: 180
    });
  }

  // --- Rounds Logic ---

  // Helper: get wizard level from DB profile
  getWizardLevel(element) {
    if (!window.dbManager || !window.dbManager.currentUser) return 1;
    const wls = window.dbManager.currentUser.wizardLevels;
    return (wls && wls[element]) ? wls[element] : 1;
  }

  // Apply level-based HP and damage scaling to a wizard
  applyLevelScaling(wiz, level) {
    const maxHp = 100 + (level - 1) * 15;
    wiz.maxHealth = maxHp;
    wiz.health = maxHp;
    wiz.damageScale = 1 + (level - 1) * 0.12;
  }

  startMatchCountdown() {
    this.roundState = 'COUNTDOWN';
    this.roundTimer = 3;
    this.clones = []; // clear any Necromancer clones
    this.lavaPools = [];
    this.stormStrikes = [];
    this.mapPillars = [];
    this.blizzardActive = false;
    this.blizzardTimer = 0;
    this.mapEffectTimer = 0;

    // Determine active battle map
    if (this.activeMap === 'random') {
      const maps = ['magma', 'ice', 'storm', 'earth'];
      this.currentBattleMap = maps[Math.floor(Math.random() * maps.length)];
    } else {
      this.currentBattleMap = this.activeMap;
    }

    // Spawn earth pillars once at start
    if (this.currentBattleMap === 'earth') {
      this.spawnEarthPillars();
    }
    
    // Reset wizard attributes with level scaling
    [this.players.host, this.players.client].forEach(wiz => {
      const lvl = this.getWizardLevel(wiz.element);
      this.applyLevelScaling(wiz, lvl);
      wiz.mana = 100;
      wiz.stun = 0;
      wiz.shield = 0;
      wiz.shieldDuration = 0;
      wiz.healDuration = 0;
      wiz.hitFlash = 0;
      wiz.potionsLeft = 2;
      wiz.wallsLeft = 1;
      wiz.successfulHits = 0;
      for (let key = 1; key <= 7; key++) {
        wiz.cooldowns[key] = 0;
      }
    });

    this.players.host.x = 200;
    this.players.host.y = this.canvas.height / 2;
    this.players.client.x = this.canvas.width - 200;
    this.players.client.y = this.canvas.height / 2;

    this.projectiles = [];
    this.thunderbolts = [];
    this.activeBolts = [];
    this.blocks = [];
    
    if (!this.isBotMode) this.broadcastEvent('countdown_trigger', { time: this.roundTimer });
    this.showAnnouncement('3', 1000);
    
    let countdownVal = 3;
    const interval = setInterval(() => {
      countdownVal--;
      if (countdownVal > 0) {
        this.showAnnouncement(countdownVal.toString(), 1000);
        if (!this.isBotMode) this.broadcastEvent('countdown_step', { time: countdownVal });
      } else {
        clearInterval(interval);
        this.roundState = 'PLAYING';
        this.showAnnouncement('FIGHT!', 1500);
        if (!this.isBotMode) this.broadcastEvent('fight_start');
        this.startRoundTimer();
      }
    }, 1000);
  }

  startRoundTimer() {
    this.stopTimer();
    
    // Fetch local selected match duration
    const durationSelect = document.getElementById('match-duration');
    const dur = durationSelect ? parseInt(durationSelect.value) : 90;
    this.roundTimer = dur;

    this.timerInterval = setInterval(() => {
      if (this.roundState === 'PLAYING') {
        this.roundTimer--;
        if (this.roundTimer <= 0) {
          this.endRound(null, 'TIME OUT');
        }
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  endRound(winnerId, reason = '') {
    this.stopTimer();
    this.roundState = 'ROUND_OVER';
    this.roundWinner = winnerId;
    
    let announceText = 'ROUND OVER';
    if (winnerId) {
      const winnerName = winnerId === 'host' ? this.players.host.name : this.players.client.name;
      announceText = `${winnerName.toUpperCase()} WINS!`;
    } else {
      announceText = reason;
    }

    this.showAnnouncement(announceText, 4000);
    if (!this.isBotMode) this.broadcastEvent('round_ended', { winner: winnerId, reason });

    setTimeout(() => {
      this.showSummaryScreen();
    }, 3800);
  }

  showAnnouncement(text, duration) {
    const banner = document.getElementById('announcer-banner');
    const bText = document.getElementById('announcer-text');
    
    bText.textContent = text;
    banner.classList.remove('hidden');
    
    setTimeout(() => {
      banner.classList.add('hidden');
    }, duration);
  }

  showSummaryScreen() {
    this.summaryScreen.classList.add('active');
    
    const isHost = window.networkManager.isHost;
    const isWinner = this.roundWinner === (isHost ? 'host' : 'client');
    const isTie = this.roundWinner === null;

    const titleEl = document.getElementById('summary-title');
    const msgEl = document.getElementById('summary-message');
    const cardEl = document.querySelector('.summary-card');

    cardEl.classList.remove('victory', 'defeat');

    if (isTie) {
      titleEl.textContent = 'DRAW MATCH';
      msgEl.textContent = 'Neither Spellcaster could claim victory.';
    } else if (isWinner) {
      titleEl.textContent = 'VICTORY';
      msgEl.textContent = 'You have proven your magical superiority!';
      cardEl.classList.add('victory');
    } else {
      titleEl.textContent = 'DEFEAT';
      msgEl.textContent = 'Your spells were broken in the arena.';
      cardEl.classList.add('defeat');
    }

    document.getElementById('stat-damage').textContent = Math.round(this.stats.damageDealt);
    document.getElementById('stat-spells').textContent = this.stats.spellsCast;
    document.getElementById('stat-blocks').textContent = this.stats.blocksCount;

    // Process match rewards for the local player
    this.processMatchRewards(isWinner, isTie);
  }

  async processMatchRewards(isWinner, isTie) {
    if (!window.dbManager || !window.dbManager.currentUser) return;
    const user = window.dbManager.currentUser;
    if (user.username === '_rebelsoulz') return; // Admin never needs rewards

    const diffRewardMap = {
      easy: { coins: 100, exp: 10 },
      medium: { coins: 200, exp: 15 },
      hard: { coins: 300, exp: 20 },
      impossible: { coins: 400, exp: 40 }
    };

    if (isWinner && !isTie) {
      const rewards = this.isBotMode
        ? (diffRewardMap[this.botDifficulty] || diffRewardMap.medium)
        : { coins: 250, exp: 25 };

      user.coins = (user.coins || 0) + rewards.coins;
      user.exp = (user.exp || 0) + rewards.exp;

      // Level up profile (every 100 EXP)
      while (user.exp >= 100) {
        user.exp -= 100;
        user.level = (user.level || 1) + 1;
        this.fx.spawnText(this.canvas.width / 2, this.canvas.height / 2 + 60, `PROFILE LEVEL UP! Lvl ${user.level}`, '#ffb700', 20, 'bold');
      }

      // Track wins
      if (this.isBotMode) {
        user.winsBot = (user.winsBot || 0) + 1;
        if (!user.difficultyWins) user.difficultyWins = { easy: 0, medium: 0, hard: 0, impossible: 0 };
        user.difficultyWins[this.botDifficulty] = (user.difficultyWins[this.botDifficulty] || 0) + 1;
      } else {
        user.winsPlayer = (user.winsPlayer || 0) + 1;
      }

      // Show reward notification
      const rewardEl = document.createElement('div');
      rewardEl.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-60%);background:rgba(0,0,0,0.85);border:2px solid #ffb700;border-radius:12px;padding:18px 28px;text-align:center;z-index:999;color:#fff;font-family:Space Grotesk,sans-serif;';
      rewardEl.innerHTML = `<div style="font-size:1.5rem;margin-bottom:6px;">🏆 Victory Rewards</div><div style="color:#39ff14;font-size:1.1rem;">+${rewards.coins} 🪙 Coins</div><div style="color:#00f3ff;font-size:1rem;">+${rewards.exp} EXP</div>`;
      document.getElementById('game-container').appendChild(rewardEl);
      setTimeout(() => rewardEl.remove(), 5000);
    }

    await window.dbManager.saveProfile();
    this.updateDashboardUI();
    this.checkNecromancerUnlock();
  }

  // --- Network Packet Parsing ---

  handleNetworkPacket(packet) {
    const isHost = window.networkManager.isHost;

    switch (packet.type) {
      case 'handshake':
        if (isHost) {
          this.players.client.name = packet.name;
          this.players.client.color = packet.color;
          this.players.client.element = packet.element;
          
          document.getElementById('p2-name').textContent = packet.name;
          document.getElementById('p2-class').textContent = this.formatClassName(packet.element);
          
          const myConfig = window.networkManager.getCustomization();
          window.networkManager.send('handshake', myConfig);
        } else {
          this.players.host.name = packet.name;
          this.players.host.color = packet.color;
          this.players.host.element = packet.element;
          
          document.getElementById('p1-name').textContent = packet.name;
          document.getElementById('p1-class').textContent = this.formatClassName(packet.element);

          // Client updates round timer to match host selection
          if (packet.matchDuration) {
            this.roundTimer = packet.matchDuration;
            const durationSelect = document.getElementById('match-duration');
            if (durationSelect) durationSelect.value = packet.matchDuration;
          }
        }
        break;

      case 'client_input':
        if (isHost && !this.isBotMode) {
          const guest = this.players.client;
          if (guest.stun <= 0 && this.roundState === 'PLAYING') {
            const inputKeys = packet.keys || {};
            let dx = 0;
            let dy = 0;
            if (inputKeys['w'] || inputKeys['arrowup']) dy -= 1;
            if (inputKeys['s'] || inputKeys['arrowdown']) dy += 1;
            if (inputKeys['a'] || inputKeys['arrowleft']) dx -= 1;
            if (inputKeys['d'] || inputKeys['arrowright']) dx += 1;
            
            if (dx !== 0 && dy !== 0) {
              dx *= 0.7071;
              dy *= 0.7071;
            }

            guest.vx = dx * guest.speed;
            guest.vy = dy * guest.speed;

            if (packet.castRequest) {
              this.castSpellAuthoritative('client', packet.castRequest.slot, packet.castRequest.target);
            }
          } else {
            guest.vx = 0;
            guest.vy = 0;
          }
        }
        break;

      case 'host_state':
        if (!isHost && !this.isBotMode) {
          this.syncAuthoritativeState(packet);
        }
        break;

      case 'game_event':
        if (!this.isBotMode) {
          this.triggerSyncedEvent(packet.eventName, packet.data);
        }
        break;

      case 'chat':
        const sender = isHost ? 'client' : 'host';
        this.addChatBubble(sender, packet.text);
        break;

      case 'rematch_request':
        document.getElementById('rematch-status').textContent = 'Opponent requested a rematch! Click Rematch to play.';
        if (document.getElementById('btn-rematch').disabled && document.getElementById('rematch-status').textContent.includes('Waiting')) {
          window.networkManager.send('rematch_accept');
          if (isHost) this.startMatchCountdown();
        }
        break;

      case 'rematch_accept':
        document.getElementById('btn-rematch').disabled = false;
        document.getElementById('rematch-status').textContent = '';
        if (isHost) {
          this.startMatchCountdown();
        }
        break;

      case 'lobby_full':
        alert('This duel lobby is already full.');
        window.networkManager.disconnect();
        break;
    }
  }

  // --- Spellcasting logic ---

  castSpellLocal() {
    const isHost = window.networkManager.isHost;
    const localWizard = isHost ? this.players.host : this.players.client;

    if (localWizard.stun > 0) return;

    let cfg;
    const slot = this.selectedSpell;
    if (slot <= 5) {
      cfg = ElementSpells[localWizard.element][slot];
    } else if (slot === 6) {
      cfg = { name: 'Healing Potion', type: 'potion', cooldown: 60, manaCost: 0 };
    } else if (slot === 7) {
      cfg = { name: 'Crate Wall', type: 'wall', cooldown: 60, manaCost: 0 };
    }

    if (!cfg) return;
    
    // Check local resources
    if (localWizard.cooldowns[slot] > 0 || localWizard.mana < (cfg.manaCost || 0)) {
      return;
    }

    if (slot === 6 && localWizard.potionsLeft <= 0) return;
    if (slot === 7 && localWizard.wallsLeft <= 0) return;

    if (isHost) {
      this.castSpellAuthoritative('host', slot, { x: this.mousePos.x, y: this.mousePos.y });
    } else {
      window.networkManager.send('client_input', {
        keys: this.localKeys,
        castRequest: {
          slot: slot,
          target: { x: this.mousePos.x, y: this.mousePos.y }
        }
      });
      // Client-side prediction for cooldown overlay
      localWizard.cooldowns[slot] = cfg.cooldown;
      if (slot <= 5) localWizard.mana -= cfg.manaCost;
      this.stats.spellsCast++;
    }
  }

  castSpellAuthoritative(ownerId, slot, target) {
    const caster = ownerId === 'host' ? this.players.host : this.players.client;
    
    let cfg;
    if (slot <= 5) {
      cfg = ElementSpells[caster.element][slot];
    } else if (slot === 6) {
      cfg = { name: 'Healing Potion', type: 'potion', cooldown: 60, manaCost: 0 };
    } else if (slot === 7) {
      cfg = { name: 'Crate Wall', type: 'wall', cooldown: 60, manaCost: 0 };
    }

    if (!cfg) return;
    if (caster.cooldowns[slot] > 0 || caster.mana < (cfg.manaCost || 0)) return;

    if (slot === 6 && caster.potionsLeft <= 0) return;
    if (slot === 7 && caster.wallsLeft <= 0) return;

    caster.cooldowns[slot] = cfg.cooldown;
    if (slot <= 5) caster.mana -= cfg.manaCost;
    caster.spellsCast++;

    if (ownerId === (window.networkManager.isHost ? 'host' : 'client')) {
      this.stats.spellsCast++;
    }

    if (cfg.type === 'projectile') {
      const angle = Math.atan2(target.y - caster.y, target.x - caster.x);
      this.projectiles.push({
        x: caster.x,
        y: caster.y,
        vx: Math.cos(angle) * cfg.speed,
        vy: Math.sin(angle) * cfg.speed,
        angle: angle,
        radius: cfg.radius,
        owner: ownerId,
        damage: cfg.damage,
        color: cfg.color
      });

      this.triggerSyncedEvent('sound_cast');
      if (!this.isBotMode) this.broadcastEvent('sound_cast');
    }
    
    else if (cfg.type === 'shield') {
      caster.shield = cfg.maxShield;
      caster.shieldDuration = cfg.duration;
      this.triggerSyncedEvent('shield_activate', { owner: ownerId });
      if (!this.isBotMode) this.broadcastEvent('shield_activate', { owner: ownerId });
    }
    
    else if (cfg.type === 'targeted') {
      const casterElement = caster.element || 'fire';
      this.thunderbolts.push({
        x: target.x,
        y: target.y,
        delay: cfg.delay,
        maxDelay: cfg.delay,
        radius: cfg.radius,
        damage: cfg.damage,
        owner: ownerId,
        stun: cfg.stunDuration,
        element: casterElement,
        color: cfg.color
      });

      this.triggerSyncedEvent('targeted_charge', { x: target.x, y: target.y, element: casterElement });
      if (!this.isBotMode) this.broadcastEvent('targeted_charge', { x: target.x, y: target.y, element: casterElement });
    }

    else if (cfg.type === 'potion') {
      caster.potionsLeft--;
      caster.health = Math.min(caster.maxHealth, caster.health + 40);
      this.triggerSyncedEvent('heal_activate', { owner: ownerId });
      if (!this.isBotMode) this.broadcastEvent('heal_activate', { owner: ownerId });
    }

    else if (cfg.type === 'wall') {
      caster.wallsLeft--;
      const enemy = ownerId === 'host' ? this.players.client : this.players.host;
      let dx = enemy.x - caster.x;
      let dy = enemy.y - caster.y;
      let dist = Math.hypot(dx, dy) || 1;
      let ux = dx / dist;
      let uy = dy / dist;
      let px = -uy;
      let py = ux;

      // Center block forms 60px in front of the enemy
      let cx = enemy.x - ux * 60;
      let cy = enemy.y - uy * 60;

      const offsets = [-35, 0, 35];
      offsets.forEach(offset => {
        const bx = cx + px * offset;
        const by = cy + py * offset;
        const clampedX = Math.max(this.bounds.xMin + 20, Math.min(this.bounds.xMax - 20, bx));
        const clampedY = Math.max(this.bounds.yMin + 20, Math.min(this.bounds.yMax - 20, by));

        this.blocks.push({
          x: clampedX,
          y: clampedY,
          radius: 20,
          life: 900 // 15 seconds at 60fps
        });

        // Spawn spawn particles
        for (let i = 0; i < 6; i++) {
          this.fx.particles.push(new Particle({
            x: clampedX, y: clampedY,
            vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
            color: '#8b5a2b', size: 3 + Math.random() * 3, life: 25, drag: 0.9
          }));
        }
      });

      this.triggerSyncedEvent('sound_explosion');
      if (!this.isBotMode) this.broadcastEvent('sound_explosion');
    }
  }

  broadcastEvent(eventName, data = {}) {
    window.networkManager.send('game_event', { eventName, data });
  }

  triggerSyncedEvent(eventName, data) {
    switch (eventName) {
      case 'sound_cast':
        this.sound.playCast();
        break;
      case 'sound_hit':
        this.sound.playHit();
        break;
      case 'sound_explosion':
        this.sound.playExplosion();
        break;
      case 'sound_heal':
        this.sound.playHeal();
        break;
      case 'sound_lightning':
        this.sound.playLightning();
        break;

      case 'countdown_trigger':
        this.showAnnouncement('3', 1000);
        break;
      case 'countdown_step':
        this.showAnnouncement(data.time.toString(), 1000);
        break;
      case 'fight_start':
        this.showAnnouncement('FIGHT!', 1500);
        break;
      case 'round_ended':
        this.roundWinner = data.winner;
        this.roundState = 'ROUND_OVER';
        this.stopTimer();
        this.showAnnouncement(data.winner ? `${(data.winner === 'host' ? this.players.host.name : this.players.client.name).toUpperCase()} WINS!` : data.reason, 4000);
        setTimeout(() => this.showSummaryScreen(), 3800);
        break;

      case 'explosion_impact':
        // Element-aware impact effects based on projectile color
        if (data.color === '#ff4500' || data.color === '#ff7700' || data.color === '#ff3300' || data.color === '#e62e00') {
          this.fx.spawnFireExplosion(data.x, data.y);
        } else if (data.color === '#aaddff' || data.color === '#00ccff' || data.color === '#00aaff' || data.color === '#ffffff') {
          this.fx.spawnIceShatter(data.x, data.y);
        } else if (data.color === '#ffe600' || data.color === '#ffffaa' || data.color === '#ffd700') {
          this.fx.spawnLightningStrike(data.x, 0, data.y);
          this.activeBolts.push({
            x: data.x, startY: 0, endY: data.y, life: 15,
            segments: this.generateJaggedPath(data.x, 0, data.y, 10)
          });
          this.sound.playLightning();
        } else if (data.color === '#8b5a2b' || data.color === '#6e473b' || data.color === '#5c4033' || data.color === '#9c6644') {
          this.fx.spawnEarthShatter(data.x, data.y);
        } else if (data.color === '#00bfff' || data.color === '#3399ff' || data.color === '#0055ff' || data.color === '#0044cc') {
          this.fx.spawnWaterGeyser(data.x, data.y);
        } else if (data.color === '#e0e0e0' || data.color === '#f0f0f0' || data.color === '#d8d8d8' || data.color === '#c0c0c0') {
          this.fx.spawnWindVortex(data.x, data.y);
        } else {
          this.fx.spawnFireExplosion(data.x, data.y);
        }
        break;
      case 'shield_activate':
        this.fx.spawnText(
          this.players[data.owner].x,
          this.players[data.owner].y - 30,
          'SHIELD',
          '#9d00ff',
          13
        );
        this.sound.playHeal();
        break;
      case 'targeted_charge':
        this.sound.playCast();
        break;
      case 'thunder_charge':
        this.sound.playCast(); // legacy fallback
        break;
      case 'lightning_impact':
        // Lightning element targeted impact
        this.fx.spawnLightningStrike(data.x, 0, data.y);
        this.sound.playLightning();
        this.activeBolts.push({
          x: data.x, startY: 0, endY: data.y, life: 15,
          segments: this.generateJaggedPath(data.x, 0, data.y, 10)
        });
        break;
      case 'targeted_impact':
        // Element-specific targeted impact
        if (data.element === 'fire') {
          this.fx.spawnFireExplosion(data.x, data.y);
          this.sound.playExplosion();
        } else if (data.element === 'ice') {
          this.fx.spawnIceShatter(data.x, data.y);
          this.fx.spawnShockwave(data.x, data.y, '#00ccff', 80, 22);
          this.sound.playExplosion();
        } else if (data.element === 'lightning') {
          this.fx.spawnLightningStrike(data.x, 0, data.y);
          this.sound.playLightning();
          this.activeBolts.push({
            x: data.x, startY: 0, endY: data.y, life: 15,
            segments: this.generateJaggedPath(data.x, 0, data.y, 10)
          });
        } else if (data.element === 'earth') {
          this.fx.spawnEarthShatter(data.x, data.y);
          this.sound.playExplosion();
        } else if (data.element === 'water') {
          this.fx.spawnWaterGeyser(data.x, data.y);
          this.sound.playExplosion();
        } else if (data.element === 'wind') {
          this.fx.spawnWindVortex(data.x, data.y);
          this.fx.spawnShockwave(data.x, data.y, '#e0e0e0', 85, 22);
          this.sound.playExplosion();
        } else {
          this.fx.spawnFireExplosion(data.x, data.y);
          this.sound.playExplosion();
        }
        break;
      case 'heal_activate':
        this.fx.spawnHealBurst(this.players[data.owner].x, this.players[data.owner].y);
        this.fx.spawnText(
          this.players[data.owner].x,
          this.players[data.owner].y - 30,
          'HEALING POTION',
          '#39ff14',
          13
        );
        this.sound.playHeal();
        break;
    }
  }

  // --- Authoritative Sync client side ---

  syncAuthoritativeState(state) {
    this.roundState = state.roundState;
    this.roundTimer = state.timer;
    
    // Sync host wizard
    this.players.host.x = state.players.host.x;
    this.players.host.y = state.players.host.y;
    this.players.host.health = state.players.host.health;
    this.players.host.mana = state.players.host.mana;
    this.players.host.stun = state.players.host.stun;
    this.players.host.shield = state.players.host.shield;
    this.players.host.shieldDuration = state.players.host.shieldDuration;
    this.players.host.healDuration = state.players.host.healDuration;
    this.players.host.hitFlash = state.players.host.hitFlash;
    this.players.host.cooldowns = state.players.host.cooldowns;
    this.players.host.potionsLeft = state.players.host.potionsLeft;
    this.players.host.wallsLeft = state.players.host.wallsLeft;

    // Sync client prediction alignment
    const clientPredictDist = Math.hypot(this.players.client.x - state.players.client.x, this.players.client.y - state.players.client.y);
    if (clientPredictDist > 16) {
      this.players.client.x = state.players.client.x;
      this.players.client.y = state.players.client.y;
    } else {
      this.players.client.x += (state.players.client.x - this.players.client.x) * 0.25;
      this.players.client.y += (state.players.client.y - this.players.client.y) * 0.25;
    }
    
    this.players.client.health = state.players.client.health;
    this.players.client.mana = state.players.client.mana;
    this.players.client.stun = state.players.client.stun;
    this.players.client.shield = state.players.client.shield;
    this.players.client.shieldDuration = state.players.client.shieldDuration;
    this.players.client.healDuration = state.players.client.healDuration;
    this.players.client.hitFlash = state.players.client.hitFlash;
    this.players.client.cooldowns = state.players.client.cooldowns;
    this.players.client.potionsLeft = state.players.client.potionsLeft;
    this.players.client.wallsLeft = state.players.client.wallsLeft;

    this.projectiles = state.projectiles;
    this.thunderbolts = state.thunderbolts;
    this.blocks = state.blocks || [];

    this.stats.damageDealt = state.players.client.damageDealt;
    this.stats.blocksCount = state.players.client.blocksCount;
  }

  // --- Map Hazard Spawning ---

  spawnEarthPillars() {
    this.mapPillars = [];
    const count = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const px = this.bounds.xMin + 80 + Math.random() * (this.bounds.xMax - this.bounds.xMin - 160);
      const py = this.bounds.yMin + 60 + Math.random() * (this.bounds.yMax - this.bounds.yMin - 120);
      this.mapPillars.push({ x: px, y: py, radius: 22 });
    }
  }

  updateMapHazards() {
    if (this.roundState !== 'PLAYING') return;
    const host = this.players.host;
    const client = this.players.client;
    this.mapEffectTimer++;

    if (this.currentBattleMap === 'magma') {
      // Spawn new lava pool every 3 seconds
      if (this.mapEffectTimer % 180 === 0) {
        const px = this.bounds.xMin + 60 + Math.random() * (this.bounds.xMax - this.bounds.xMin - 120);
        const py = this.bounds.yMin + 60 + Math.random() * (this.bounds.yMax - this.bounds.yMin - 120);
        this.lavaPools.push({ x: px, y: py, radius: 38, life: 480 });
      }
      // Damage players standing in lava
      for (let i = this.lavaPools.length - 1; i >= 0; i--) {
        const lava = this.lavaPools[i];
        lava.life--;
        if (lava.life <= 0) { this.lavaPools.splice(i, 1); continue; }
        [host, client].forEach(wiz => {
          if (wiz.health <= 0 || wiz.shield > 0) return;
          if (Math.hypot(wiz.x - lava.x, wiz.y - lava.y) < lava.radius + wiz.radius) {
            if (this.mapEffectTimer % 60 === 0) {
              wiz.health = Math.max(0, wiz.health - 6);
              wiz.hitFlash = 5;
              this.fx.spawnText(wiz.x, wiz.y - 20, '-6 LAVA', '#ff5500', 13, 'bold');
              if (wiz.health <= 0) this.endRound(wiz === host ? 'client' : 'host');
            }
          }
        });
      }
    }

    else if (this.currentBattleMap === 'ice') {
      // Slippery: reduce deceleration (apply ice drift)
      [host, client].forEach(wiz => {
        if (wiz.health <= 0) return;
        // Ice inertia: gradually bleed velocity instead of instant stop
        wiz.vx *= 0.82;
        wiz.vy *= 0.82;
      });
      // Blizzard periodic damage
      if (this.mapEffectTimer % 300 === 0) {
        this.blizzardActive = true;
        this.blizzardTimer = 120;
      }
      if (this.blizzardActive) {
        this.blizzardTimer--;
        if (this.blizzardTimer <= 0) this.blizzardActive = false;
        if (this.mapEffectTimer % 30 === 0) {
          [host, client].forEach(wiz => {
            if (wiz.health <= 0 || wiz.shield > 0) return;
            wiz.health = Math.max(0, wiz.health - 4);
            wiz.hitFlash = 3;
            this.fx.spawnText(wiz.x, wiz.y - 20, '-4 BLIZZARD', '#aaddff', 12, 'bold');
            if (wiz.health <= 0) this.endRound(wiz === host ? 'client' : 'host');
          });
        }
      }
    }

    else if (this.currentBattleMap === 'storm') {
      // Random lightning strike every 4 seconds
      if (this.mapEffectTimer % 240 === 0) {
        const sx = this.bounds.xMin + 40 + Math.random() * (this.bounds.xMax - this.bounds.xMin - 80);
        const sy = this.bounds.yMin + 40 + Math.random() * (this.bounds.yMax - this.bounds.yMin - 80);
        this.stormStrikes.push({ x: sx, y: sy, delay: 60, maxDelay: 60, radius: 50 });
      }
      for (let i = this.stormStrikes.length - 1; i >= 0; i--) {
        const strike = this.stormStrikes[i];
        strike.delay--;
        // Charge particles
        if (Math.random() < 0.4) {
          const P = window.Particle;
          this.fx.particles.push(new P({
            x: strike.x + (Math.random() - 0.5) * 30, y: strike.y,
            vx: (Math.random() - 0.5) * 2, vy: -1 - Math.random() * 2,
            color: '#ffe600', size: 2 + Math.random() * 2, life: 12, drag: 0.92, shape: 'spark'
          }));
        }
        if (strike.delay <= 0) {
          // Impact
          this.fx.spawnLightningStrike(strike.x, 0, strike.y);
          this.activeBolts.push({ x: strike.x, startY: 0, endY: strike.y, life: 12, segments: this.generateJaggedPath(strike.x, 0, strike.y, 10) });
          this.sound.playLightning();
          [host, client].forEach(wiz => {
            if (wiz.health <= 0 || wiz.shield > 0) return;
            if (Math.hypot(wiz.x - strike.x, wiz.y - strike.y) < strike.radius) {
              wiz.health = Math.max(0, wiz.health - 14);
              wiz.hitFlash = 5;
              wiz.stun = 30;
              this.fx.spawnText(wiz.x, wiz.y - 20, '-14 LIGHTNING STRIKE', '#ffe600', 13, 'bold');
              if (wiz.health <= 0) this.endRound(wiz === host ? 'client' : 'host');
            }
          });
          this.stormStrikes.splice(i, 1);
        }
      }
    }

    else if (this.currentBattleMap === 'earth') {
      // Earth pillars act as solid obstacles (collision handled separately)
      // Occasional boulder roll every 5 seconds
      if (this.mapEffectTimer % 300 === 0 && this.mapPillars && this.mapPillars.length > 0) {
        // Boulder originates from a random pillar
        const pillar = this.mapPillars[Math.floor(Math.random() * this.mapPillars.length)];
        const angle = Math.random() * Math.PI * 2;
        this.projectiles.push({
          x: pillar.x, y: pillar.y,
          vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
          angle: angle, radius: 14, owner: 'map',
          damage: 12, color: '#8b5a2b'
        });
      }
    }
  }

  // --- Necromancer Clone Passive ---

  spawnNecroClones(necroWiz, targetWiz) {
    for (let i = 0; i < 2; i++) {
      const offsetX = (i === 0 ? -1 : 1) * 40;
      this.clones.push({
        x: necroWiz.x + offsetX,
        y: necroWiz.y + 20,
        vx: 0,
        vy: 0,
        radius: 14,
        health: necroWiz.maxHealth * 0.5,
        maxHealth: necroWiz.maxHealth * 0.5,
        damageScale: (necroWiz.damageScale || 1) * 0.45,
        owner: necroWiz === this.players.host ? 'host' : 'client',
        cooldown: 0,
        color: '#2e8b57',
        life: 600 // 10 seconds
      });
    }
    this.fx.spawnText(necroWiz.x, necroWiz.y - 40, 'CLONES SUMMONED!', '#2e8b57', 14, 'bold');
    this.sound.playExplosion();
  }

  updateClones() {
    const host = this.players.host;
    const client = this.players.client;

    for (let i = this.clones.length - 1; i >= 0; i--) {
      const clone = this.clones[i];
      clone.life--;
      if (clone.life <= 0 || clone.health <= 0) {
        this.clones.splice(i, 1);
        continue;
      }

      const target = clone.owner === 'host' ? client : host;
      if (!target || target.health <= 0) continue;

      // Move toward target
      const dx = target.x - clone.x;
      const dy = target.y - clone.y;
      const dist = Math.hypot(dx, dy) || 1;
      clone.vx = (dx / dist) * 2.2;
      clone.vy = (dy / dist) * 2.2;
      clone.x += clone.vx;
      clone.y += clone.vy;

      // Clamp to arena
      clone.x = Math.max(this.bounds.xMin + clone.radius, Math.min(this.bounds.xMax - clone.radius, clone.x));
      clone.y = Math.max(this.bounds.yMin + clone.radius, Math.min(this.bounds.yMax - clone.radius, clone.y));

      // Periodically shoot at target
      clone.cooldown = (clone.cooldown || 0) - 1;
      if (clone.cooldown <= 0 && dist < 350) {
        clone.cooldown = 90;
        const angle = Math.atan2(dy, dx);
        this.projectiles.push({
          x: clone.x, y: clone.y,
          vx: Math.cos(angle) * 7, vy: Math.sin(angle) * 7,
          angle, radius: 7, owner: clone.owner,
          damage: 15 * clone.damageScale, color: '#2e8b57'
        });
      }

      // Clone takes damage from enemy projectiles
      for (let j = this.projectiles.length - 1; j >= 0; j--) {
        const proj = this.projectiles[j];
        if (proj.owner === clone.owner) continue;
        if (Math.hypot(proj.x - clone.x, proj.y - clone.y) < proj.radius + clone.radius) {
          clone.health -= proj.damage;
          this.projectiles.splice(j, 1);
          this.fx.spawnText(clone.x, clone.y - 15, `-${Math.round(proj.damage)}`, '#ff3b30', 12, 'bold');
        }
      }
    }
  }

  // --- Authoritative physics ---

  updatePhysicsAuthoritative() {
    if (this.isBotMode) {
      this.updateBotAI();
    }

    // Update map hazards
    this.updateMapHazards();

    // Update Necromancer clones
    this.updateClones();

    // Earth map pillar collision with players
    if (this.currentBattleMap === 'earth' && this.mapPillars) {
      [this.players.host, this.players.client].forEach(wiz => {
        if (!this.mapPillars) return;
        this.mapPillars.forEach(pillar => {
          const dist = Math.hypot(wiz.x - pillar.x, wiz.y - pillar.y);
          const minDist = wiz.radius + pillar.radius;
          if (dist < minDist && dist > 0) {
            const nx = (wiz.x - pillar.x) / dist;
            const ny = (wiz.y - pillar.y) / dist;
            wiz.x += nx * (minDist - dist);
            wiz.y += ny * (minDist - dist);
          }
        });
      });
    }

    const host = this.players.host;
    const client = this.players.client;

    [host, client].forEach((wiz) => {
      if (wiz.health > 0) {
        wiz.mana = Math.min(wiz.maxMana, wiz.mana + wiz.manaRegen);
      }

      for (let s in wiz.cooldowns) {
        if (wiz.cooldowns[s] > 0) wiz.cooldowns[s]--;
      }

      if (wiz.stun > 0) wiz.stun--;
      if (wiz.hitFlash > 0) wiz.hitFlash--;
      
      if (wiz.shieldDuration > 0) {
        wiz.shieldDuration--;
        if (wiz.shieldDuration <= 0) wiz.shield = 0;
      }

      if (wiz.stun <= 0 && this.roundState === 'PLAYING') {
        wiz.x += wiz.vx;
        wiz.y += wiz.vy;
        
        wiz.x = Math.max(this.bounds.xMin + wiz.radius, Math.min(this.bounds.xMax - wiz.radius, wiz.x));
        wiz.y = Math.max(this.bounds.yMin + wiz.radius, Math.min(this.bounds.yMax - wiz.radius, wiz.y));
      }
    });

    // Check circular blocks wall collision with players
    [host, client].forEach((wiz) => {
      if (wiz.health <= 0) return;
      this.blocks.forEach((block) => {
        const dist = Math.hypot(wiz.x - block.x, wiz.y - block.y);
        const minDist = wiz.radius + block.radius;
        if (dist < minDist) {
          const overlap = minDist - dist;
          let nx = (wiz.x - block.x) / (dist || 1);
          let ny = (wiz.y - block.y) / (dist || 1);
          wiz.x += nx * overlap;
          wiz.y += ny * overlap;
        }
      });
    });

    // Local Host control inputs
    if (host.stun <= 0 && this.roundState === 'PLAYING') {
      let hdx = 0;
      let hdy = 0;
      if (this.localKeys['w'] || this.localKeys['arrowup']) hdy -= 1;
      if (this.localKeys['s'] || this.localKeys['arrowdown']) hdy += 1;
      if (this.localKeys['a'] || this.localKeys['arrowleft']) hdx -= 1;
      if (this.localKeys['d'] || this.localKeys['arrowright']) hdx += 1;

      if (hdx !== 0 && hdy !== 0) {
        hdx *= 0.7071;
        hdy *= 0.7071;
      }
      host.vx = hdx * host.speed;
      host.vy = hdy * host.speed;
    } else {
      host.vx = 0;
      host.vy = 0;
    }

    // Decay active blocks
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      this.blocks[i].life--;
      if (this.blocks[i].life <= 0) {
        this.blocks.splice(i, 1);
      }
    }

    // Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;

      // Arena boundary collision
      if (proj.x < this.bounds.xMin || proj.x > this.bounds.xMax || proj.y < this.bounds.yMin || proj.y > this.bounds.yMax) {
        this.triggerSyncedEvent('explosion_impact', { x: proj.x, y: proj.y, color: proj.color });
        if (!this.isBotMode) this.broadcastEvent('explosion_impact', { x: proj.x, y: proj.y, color: proj.color });
        this.projectiles.splice(i, 1);
        continue;
      }

      // Crate block collision
      let hitBlock = false;
      for (let j = 0; j < this.blocks.length; j++) {
        const block = this.blocks[j];
        if (Math.hypot(proj.x - block.x, proj.y - block.y) < proj.radius + block.radius) {
          hitBlock = true;
          break;
        }
      }
      if (hitBlock) {
        this.triggerSyncedEvent('explosion_impact', { x: proj.x, y: proj.y, color: proj.color });
        if (!this.isBotMode) this.broadcastEvent('explosion_impact', { x: proj.x, y: proj.y, color: proj.color });
        this.projectiles.splice(i, 1);
        continue;
      }

      let hitTarget = null;
      if (proj.owner === 'map') {
        if (Math.hypot(proj.x - host.x, proj.y - host.y) < host.radius + proj.radius) {
          hitTarget = 'host';
        } else if (Math.hypot(proj.x - client.x, proj.y - client.y) < client.radius + proj.radius) {
          hitTarget = 'client';
        }
      } else if (proj.owner === 'host' && Math.hypot(proj.x - client.x, proj.y - client.y) < client.radius + proj.radius) {
        hitTarget = 'client';
      } else if (proj.owner === 'client' && Math.hypot(proj.x - host.x, proj.y - host.y) < host.radius + proj.radius) {
        hitTarget = 'host';
      }

      if (hitTarget) {
        const wiz = hitTarget === 'host' ? host : client;
        const opponent = hitTarget === 'host' ? client : host;
        
        // Scale damage by attacker's wizard level (if attacker is a player/bot; not 'map')
        let dmg = proj.damage;
        if (proj.owner !== 'map') {
          dmg *= (opponent.damageScale || 1);
        }
        if (wiz.shield > 0) {
          const absorbed = Math.min(wiz.shield, dmg);
          wiz.shield -= absorbed;
          dmg -= absorbed;
          wiz.blocksCount++;
          
          this.triggerSyncedEvent('sound_hit');
          if (!this.isBotMode) this.broadcastEvent('sound_hit');
          this.fx.spawnText(wiz.x, wiz.y - 25, 'BLOCKED', '#00ccff', 12);
          
          if (wiz.shield <= 0) wiz.shieldDuration = 0;
        }

        if (dmg > 0) {
          wiz.health = Math.max(0, wiz.health - dmg);
          wiz.hitFlash = 5; // trigger hit flash
          opponent.damageDealt += dmg;

          // Necromancer clone passive: count hits by opponent
          if (opponent.element === 'necromancer') {
            opponent.successfulHits = (opponent.successfulHits || 0) + 1;
            if (opponent.successfulHits === 2) {
              opponent.successfulHits = 0; // reset counter
              this.spawnNecroClones(opponent, wiz);
            }
          }
          
          if (hitTarget === (window.networkManager.isHost ? 'client' : 'host')) {
            this.stats.damageDealt += dmg;
          }

          this.triggerSyncedEvent('sound_explosion', { x: proj.x, y: proj.y });
          if (!this.isBotMode) this.broadcastEvent('sound_explosion', { x: proj.x, y: proj.y });
          this.fx.spawnText(wiz.x, wiz.y - 20, `-${Math.round(dmg)}`, '#ff3b30', 16, 'bold');
        }

        this.triggerSyncedEvent('explosion_impact', { x: proj.x, y: proj.y, color: proj.color });
        if (!this.isBotMode) this.broadcastEvent('explosion_impact', { x: proj.x, y: proj.y, color: proj.color });
        
        this.projectiles.splice(i, 1);
        
        if (wiz.health <= 0) {
          this.endRound(hitTarget === 'host' ? 'client' : 'host');
        }
      }
    }

    // Targeted area strikes (all elements)
    for (let i = this.thunderbolts.length - 1; i >= 0; i--) {
      const bolt = this.thunderbolts[i];
      bolt.delay--;
      
      // Spawn element-specific charge particles while charging
      const elem = bolt.element || 'lightning';
      if (elem === 'lightning') {
        this.fx.spawnLightningCharge(bolt.x, bolt.y);
      } else if (elem === 'fire') {
        // Rising heat shimmer around impact zone
        if (Math.random() < 0.3) {
          const P = window.Particle;
          const angle = Math.random() * Math.PI * 2;
          const r = bolt.radius * 0.4 * Math.random();
          this.fx.particles.push(new P({
            x: bolt.x + Math.cos(angle) * r, y: bolt.y + Math.sin(angle) * r,
            vx: (Math.random() - 0.5) * 0.6, vy: -1 - Math.random(),
            color: `hsl(${15 + Math.random() * 20}, 100%, 60%)`,
            size: 2 + Math.random() * 3, life: 18, drag: 0.95, gravity: -0.02
          }));
        }
      } else if (elem === 'ice') {
        if (Math.random() < 0.3) {
          const P = window.Particle;
          const angle = Math.random() * Math.PI * 2;
          const r = bolt.radius * 0.4 * Math.random();
          this.fx.particles.push(new P({
            x: bolt.x + Math.cos(angle) * r, y: bolt.y + Math.sin(angle) * r,
            vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
            color: '#aaddff', size: 2 + Math.random() * 2, life: 15, drag: 0.97, shape: 'star'
          }));
        }
      } else if (elem === 'earth') {
        if (Math.random() < 0.2) {
          const P = window.Particle;
          const angle = Math.random() * Math.PI * 2;
          const r = bolt.radius * 0.5 * Math.random();
          this.fx.particles.push(new P({
            x: bolt.x + Math.cos(angle) * r, y: bolt.y + Math.sin(angle) * r,
            vx: (Math.random() - 0.5) * 0.8, vy: -0.5 - Math.random() * 0.5,
            color: '#8b5a2b', size: 2 + Math.random() * 3, life: 20, drag: 0.96, gravity: 0.04, shape: 'shard'
          }));
        }
      } else if (elem === 'water') {
        if (Math.random() < 0.3) {
          const P = window.Particle;
          const angle = Math.random() * Math.PI * 2;
          const r = bolt.radius * 0.4 * Math.random();
          this.fx.particles.push(new P({
            x: bolt.x + Math.cos(angle) * r, y: bolt.y + Math.sin(angle) * r,
            vx: (Math.random() - 0.5) * 0.8, vy: -0.8 - Math.random(),
            color: '#3399ff', size: 2 + Math.random() * 2, life: 15, drag: 0.96, gravity: 0.05
          }));
        }
      } else if (elem === 'wind') {
        if (Math.random() < 0.3) {
          const P = window.Particle;
          const angle = Math.random() * Math.PI * 2;
          const r = bolt.radius * 0.4 * Math.random();
          this.fx.particles.push(new P({
            x: bolt.x + Math.cos(angle) * r, y: bolt.y + Math.sin(angle) * r,
            vx: -Math.sin(angle) * (1 + Math.random()), vy: Math.cos(angle) * 0.5 - 0.5,
            color: '#d0d0d0', size: 1.5 + Math.random() * 2, life: 14, drag: 0.98, gravity: -0.02, shape: 'star'
          }));
        }
      }

      if (bolt.delay <= 0) {
        this.triggerSyncedEvent('targeted_impact', { x: bolt.x, y: bolt.y, element: bolt.element || 'lightning' });
        if (!this.isBotMode) this.broadcastEvent('targeted_impact', { x: bolt.x, y: bolt.y, element: bolt.element || 'lightning' });

        [host, client].forEach((wiz, idx) => {
          const idStr = idx === 0 ? 'host' : 'client';
          const dist = Math.hypot(wiz.x - bolt.x, wiz.y - bolt.y);
          if (dist < bolt.radius) {
            const casterStr = bolt.owner;
            const caster = casterStr === 'host' ? host : client;
            // Scale damage by caster's wizard level
            let dmg = bolt.damage * (caster.damageScale || 1);
            
            if (wiz.shield > 0) {
              const absorbed = Math.min(wiz.shield, dmg);
              wiz.shield -= absorbed;
              dmg -= absorbed;
              wiz.blocksCount++;
              this.fx.spawnText(wiz.x, wiz.y - 25, 'BLOCKED', '#00ccff', 12);
              if (wiz.shield <= 0) wiz.shieldDuration = 0;
            }

            if (dmg > 0) {
              wiz.health = Math.max(0, wiz.health - dmg);
              wiz.hitFlash = 5;
              wiz.stun = bolt.stun;
              
              const opponent = idStr === 'host' ? client : host;
              opponent.damageDealt += dmg;

              // Necromancer clone passive: count targeted hits too
              if (opponent.element === 'necromancer') {
                opponent.successfulHits = (opponent.successfulHits || 0) + 1;
                if (opponent.successfulHits === 2) {
                  opponent.successfulHits = 0;
                  this.spawnNecroClones(opponent, wiz);
                }
              }

              if (idStr === (window.networkManager.isHost ? 'client' : 'host')) {
                this.stats.damageDealt += dmg;
              }

              const elemTextColors = {
                fire: '#ff5500', ice: '#aaddff', lightning: '#ffe600',
                earth: '#39ff14', water: '#3399ff', wind: '#e0e0e0', necromancer: '#2e8b57'
              };
              const hitColor = elemTextColors[bolt.element] || '#ffe600';
              const hitLabel = bolt.stun > 0 ? `-${Math.round(dmg)} STUN` : `-${Math.round(dmg)}`;
              this.fx.spawnText(wiz.x, wiz.y - 20, hitLabel, hitColor, 16, 'bold');
            }

            if (wiz.health <= 0) {
              this.endRound(idStr === 'host' ? 'client' : 'host');
            }
          }
        });

        this.thunderbolts.splice(i, 1);
      }
    }

    if (!this.isBotMode) {
      const state = {
        roundState: this.roundState,
        timer: this.roundTimer,
        players: {
          host: {
            x: host.x, y: host.y,
            health: host.health, mana: host.mana,
            stun: host.stun, shield: host.shield,
            shieldDuration: host.shieldDuration, healDuration: host.healDuration,
            cooldowns: host.cooldowns, damageDealt: host.damageDealt, blocksCount: host.blocksCount,
            hitFlash: host.hitFlash, potionsLeft: host.potionsLeft, wallsLeft: host.wallsLeft
          },
          client: {
            x: client.x, y: client.y,
            health: client.health, mana: client.mana,
            stun: client.stun, shield: client.shield,
            shieldDuration: client.shieldDuration, healDuration: client.healDuration,
            cooldowns: client.cooldowns, damageDealt: client.damageDealt, blocksCount: client.blocksCount,
            hitFlash: client.hitFlash, potionsLeft: client.potionsLeft, wallsLeft: client.wallsLeft
          }
        },
        projectiles: this.projectiles.map(p => ({
          x: p.x, y: p.y, vx: p.vx, vy: p.vy, angle: p.angle, radius: p.radius, owner: p.owner, damage: p.damage, color: p.color
        })),
        thunderbolts: this.thunderbolts.map(t => ({
          x: t.x, y: t.y, delay: t.delay, radius: t.radius, damage: t.damage, owner: t.owner
        })),
        blocks: this.blocks.map(b => ({
          x: b.x, y: b.y, radius: b.radius, life: b.life
        }))
      };
      window.networkManager.send('host_state', state);
    }
  }

  updateClientPrediction() {
    const client = this.players.client;

    for (let s in client.cooldowns) {
      if (client.cooldowns[s] > 0) client.cooldowns[s]--;
    }
    
    if (client.health > 0) {
      client.mana = Math.min(client.maxMana, client.mana + client.manaRegen);
    }

    if (client.stun <= 0 && this.roundState === 'PLAYING') {
      let dx = 0;
      let dy = 0;
      if (this.localKeys['w'] || this.localKeys['arrowup']) dy -= 1;
      if (this.localKeys['s'] || this.localKeys['arrowdown']) dy += 1;
      if (this.localKeys['a'] || this.localKeys['arrowleft']) dx -= 1;
      if (this.localKeys['d'] || this.localKeys['arrowright']) dx += 1;

      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }

      client.x += dx * client.speed;
      client.y += dy * client.speed;

      client.x = Math.max(this.bounds.xMin + client.radius, Math.min(this.bounds.xMax - client.radius, client.x));
      client.y = Math.max(this.bounds.yMin + client.radius, Math.min(this.bounds.yMax - client.radius, client.y));
    }

    // Client wall block collisions
    this.blocks.forEach((block) => {
      const dist = Math.hypot(client.x - block.x, client.y - block.y);
      const minDist = client.radius + block.radius;
      if (dist < minDist) {
        const overlap = minDist - dist;
        let nx = (client.x - block.x) / (dist || 1);
        let ny = (client.y - block.y) / (dist || 1);
        client.x += nx * overlap;
        client.y += ny * overlap;
      }
    });

    window.networkManager.send('client_input', {
      keys: this.localKeys
    });
  }

  startGameLoop() {
    const loop = () => {
      if (!window.networkManager.isConnected && !this.isBotMode) return;

      try {
        if (window.networkManager.isHost) {
          this.updatePhysicsAuthoritative();
        } else {
          this.updateClientPrediction();
        }

        this.updateVisualEffects();
        this.drawGame();
      } catch (err) {
        console.error('[GameLoop Error]', err);
      }

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  updateVisualEffects() {
    const P = window.Particle;
    this.projectiles.forEach(p => {
      const c = p.color;
      // Fire trails
      if (c === '#ff4500' || c === '#ff7700') {
        this.fx.spawnFireballTrail(p.x, p.y, p.angle);
      }
      // Fire targeted impacts (magma/meteor) — reddish core glow trail
      else if (c === '#ff3300' || c === '#e62e00') {
        if (Math.random() < 0.5) this.fx.particles.push(new P({
          x: p.x, y: p.y,
          vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
          color: `hsl(${10 + Math.random() * 20}, 100%, 55%)`,
          size: 3 + Math.random() * 4, life: 14, drag: 0.93, gravity: 0.04
        }));
      }
      // Ice / Cryo trails
      else if (c === '#aaddff' || c === '#00ccff' || c === '#00aaff') {
        this.fx.spawnIceTrail(p.x, p.y, p.angle);
      }
      // Lightning spark trails
      else if (c === '#ffe600' || c === '#ffffaa' || c === '#ffd700') {
        if (Math.random() < 0.55) this.fx.particles.push(new P({
          x: p.x, y: p.y,
          vx: (Math.random() - 0.5) * 2.5, vy: (Math.random() - 0.5) * 2.5,
          color: Math.random() < 0.5 ? '#ffe600' : '#ffffff',
          size: 2 + Math.random() * 3, life: 10, drag: 0.88, shape: 'spark'
        }));
      }
      // Earth / geo trails (brown rocks)
      else if (c === '#8b5a2b' || c === '#6e473b' || c === '#5c4033' || c === '#9c6644') {
        if (Math.random() < 0.4) this.fx.particles.push(new P({
          x: p.x, y: p.y,
          vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
          color: c, size: 3 + Math.random() * 3, life: 14, drag: 0.94,
          gravity: 0.08, shape: 'shard'
        }));
      }
      // Water / Hydro trails
      else if (c === '#00bfff' || c === '#3399ff' || c === '#0055ff' || c === '#0044cc') {
        this.fx.spawnIceTrail(p.x, p.y, p.angle); // water uses similar droplet spray
      }
      // Wind / Tempest trails (grey-white swirls)
      else if (c === '#e0e0e0' || c === '#f0f0f0' || c === '#d8d8d8' || c === '#c0c0c0') {
        if (Math.random() < 0.45) this.fx.particles.push(new P({
          x: p.x + (Math.random() - 0.5) * 6, y: p.y + (Math.random() - 0.5) * 6,
          vx: -Math.sin(p.angle) * (0.5 + Math.random()) + (Math.random() - 0.5),
          vy: Math.cos(p.angle) * (0.5 + Math.random()),
          color: '#e8e8e8', size: 2 + Math.random() * 3, life: 14, drag: 0.97,
          gravity: -0.02, shape: 'star'
        }));
      }
      // Fallback
      else {
        if (Math.random() < 0.3) this.fx.particles.push(new P({
          x: p.x, y: p.y,
          vx: (Math.random() - 0.5) * 1.2, vy: (Math.random() - 0.5) * 1.2,
          color: c, size: 3 + Math.random() * 3, life: 12, drag: 0.95
        }));
      }
    });

    const host = this.players.host;
    const client = this.players.client;

    [host, client].forEach(wiz => {
      this.fx.spawnWizardAura(wiz.x, wiz.y, wiz.color);
      
      // Spawn movement dust trails
      if (Math.hypot(wiz.vx, wiz.vy) > 0.5) {
        this.fx.spawnMovementDust(wiz.x, wiz.y, wiz.color);
      }
      
      if (wiz.stun > 0) {
        this.fx.spawnStunStars(wiz.x, wiz.y);
      }
    });

    this.fx.update();

    for (let i = this.activeChats.length - 1; i >= 0; i--) {
      this.activeChats[i].life--;
      if (this.activeChats[i].life <= 0) {
        this.activeChats.splice(i, 1);
      }
    }
  }

  // --- Canvas Rendering loops ---

  drawGame() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.save();
    this.fx.applyShake(this.ctx);

    // 1. Draw Summoning Field background (map-aware)
    this.drawArenaField();

    // 2. Map hazard elements (lava pools, ice overlay, storm zone, earth pillars)
    this.drawMapHazards();

    // 3. Crate Wall Blocks
    this.drawCrateBlocks();

    // 4. Thunderbolt / targeted Indicators
    this.drawThunderboltWarnings();

    // 4b. Storm strike warnings
    this.drawStormWarnings();

    // 5. Spells Projectiles
    this.drawProjectiles();

    // 6. Necromancer clones
    this.drawClones();

    // 7. Wizard avatars (with hit flashes)
    this.drawWizardEntity(this.players.host);
    this.drawWizardEntity(this.players.client);

    // 8. Solid Jagged Lightning columns
    this.drawLightningBolts();

    // 9. Particles & shockwave rings
    this.fx.draw(this.ctx);

    // 10. Emote chats
    this.drawChatBubbles();

    this.ctx.restore();

    this.syncHUDBarIndicators();
  }

  drawMapHazards() {
    const ctx = this.ctx;
    const map = this.currentBattleMap;

    if (map === 'magma') {
      this.lavaPools.forEach(lava => {
        ctx.save();
        const grad = ctx.createRadialGradient(lava.x, lava.y, 4, lava.x, lava.y, lava.radius);
        grad.addColorStop(0, 'rgba(255, 160, 0, 0.95)');
        grad.addColorStop(0.6, 'rgba(255, 60, 0, 0.6)');
        grad.addColorStop(1, 'rgba(180, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(lava.x, lava.y, lava.radius, 0, Math.PI * 2);
        ctx.fill();
        // Pulsing inner glow
        const pulse = 1 + Math.sin(Date.now() * 0.006) * 0.1;
        ctx.strokeStyle = `rgba(255, 220, 0, ${0.5 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });
      // Magma map tint
      ctx.save();
      ctx.fillStyle = 'rgba(120, 20, 0, 0.04)';
      ctx.fillRect(this.bounds.xMin, this.bounds.yMin, this.bounds.xMax - this.bounds.xMin, this.bounds.yMax - this.bounds.yMin);
      ctx.restore();
    }

    else if (map === 'ice') {
      // Ice floor tint
      ctx.save();
      ctx.fillStyle = 'rgba(0, 180, 255, 0.04)';
      ctx.fillRect(this.bounds.xMin, this.bounds.yMin, this.bounds.xMax - this.bounds.xMin, this.bounds.yMax - this.bounds.yMin);
      // Blizzard veil
      if (this.blizzardActive) {
        ctx.fillStyle = `rgba(200, 235, 255, ${0.12 + Math.sin(Date.now() * 0.004) * 0.05})`;
        ctx.fillRect(this.bounds.xMin, this.bounds.yMin, this.bounds.xMax - this.bounds.xMin, this.bounds.yMax - this.bounds.yMin);
        ctx.fillStyle = 'rgba(170,220,255,0.6)';
        ctx.font = 'bold 18px Space Grotesk, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('❄ BLIZZARD ❄', this.canvas.width / 2, this.bounds.yMin + 28);
      }
      ctx.restore();
    }

    else if (map === 'storm') {
      // Storm map tint
      ctx.save();
      ctx.fillStyle = 'rgba(60, 40, 120, 0.05)';
      ctx.fillRect(this.bounds.xMin, this.bounds.yMin, this.bounds.xMax - this.bounds.xMin, this.bounds.yMax - this.bounds.yMin);
      ctx.restore();
    }

    else if (map === 'earth' && this.mapPillars) {
      this.mapPillars.forEach(pillar => {
        ctx.save();
        const grad = ctx.createRadialGradient(pillar.x, pillar.y, 4, pillar.x, pillar.y, pillar.radius);
        grad.addColorStop(0, '#a07850');
        grad.addColorStop(1, '#4a3020');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#2d1808';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#39ff14';
        ctx.beginPath();
        ctx.arc(pillar.x, pillar.y, pillar.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // Rune marks on pillar
        ctx.strokeStyle = 'rgba(100, 255, 100, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pillar.x, pillar.y - pillar.radius * 0.6);
        ctx.lineTo(pillar.x, pillar.y + pillar.radius * 0.6);
        ctx.moveTo(pillar.x - pillar.radius * 0.6, pillar.y);
        ctx.lineTo(pillar.x + pillar.radius * 0.6, pillar.y);
        ctx.stroke();
        ctx.restore();
      });
    }
  }

  drawStormWarnings() {
    if (this.currentBattleMap !== 'storm') return;
    const ctx = this.ctx;
    this.stormStrikes.forEach(strike => {
      ctx.save();
      const progress = 1 - (strike.delay / strike.maxDelay);
      ctx.strokeStyle = `rgba(255, 230, 0, ${progress * 0.8})`;
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(strike.x, strike.y, strike.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 230, 0, ${progress * 0.1})`;
      ctx.beginPath();
      ctx.arc(strike.x, strike.y, strike.radius * progress, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawClones() {
    const ctx = this.ctx;
    this.clones.forEach(clone => {
      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(clone.x, clone.y + 12, clone.radius * 0.8, clone.radius * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      // Body
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#2e8b57';
      ctx.fillStyle = '#2e8b57';
      ctx.beginPath();
      ctx.arc(clone.x, clone.y, clone.radius, 0, Math.PI * 2);
      ctx.fill();
      // Inner rune
      ctx.fillStyle = 'rgba(200, 255, 200, 0.6)';
      ctx.font = `bold ${clone.radius}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💀', clone.x, clone.y);
      // Health bar
      const hpPct = clone.health / clone.maxHealth;
      const barW = clone.radius * 2.4;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(clone.x - barW / 2, clone.y - clone.radius - 8, barW, 4);
      ctx.fillStyle = hpPct > 0.5 ? '#39ff14' : '#ff5500';
      ctx.fillRect(clone.x - barW / 2, clone.y - clone.radius - 8, barW * hpPct, 4);
      // Life timer fade
      ctx.globalAlpha = Math.min(1, clone.life / 120);
      ctx.restore();
    });
  }

  drawArenaField() {
    const ctx = this.ctx;

    // Map-specific border color
    const mapBorderColors = {
      magma: 'rgba(255, 80, 0, 0.25)',
      ice: 'rgba(0, 200, 255, 0.2)',
      storm: 'rgba(180, 140, 255, 0.22)',
      earth: 'rgba(80, 200, 60, 0.2)'
    };
    const borderColor = mapBorderColors[this.currentBattleMap] || 'rgba(157, 0, 255, 0.15)';
    
    // Draw boundary rectangle
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.bounds.xMin, this.bounds.yMin, this.bounds.xMax - this.bounds.xMin, this.bounds.yMax - this.bounds.yMin);
    
    // Draw rotating Summoning circles in center background
    const timeAngle = Date.now() * 0.0006;
    ctx.save();
    ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    ctx.rotate(timeAngle);
    
    ctx.strokeStyle = 'rgba(157, 0, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 160, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 243, 255, 0.04)';
    ctx.beginPath();
    ctx.arc(0, 0, 130, 0, Math.PI * 2);
    ctx.stroke();

    // Hexagram inner lines
    ctx.strokeStyle = 'rgba(157, 0, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) * Math.PI / 180;
      const x1 = Math.cos(angle) * 130;
      const y1 = Math.sin(angle) * 130;
      const x2 = Math.cos(angle + 120 * Math.PI / 180) * 130;
      const y2 = Math.sin(angle + 120 * Math.PI / 180) * 130;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // Corners lines decor
    const dSize = 15;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.35)';
    ctx.lineWidth = 3;
    
    ctx.beginPath();
    ctx.moveTo(this.bounds.xMin, this.bounds.yMin + dSize); ctx.lineTo(this.bounds.xMin, this.bounds.yMin); ctx.lineTo(this.bounds.xMin + dSize, this.bounds.yMin);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.bounds.xMax, this.bounds.yMin + dSize); ctx.lineTo(this.bounds.xMax, this.bounds.yMin); ctx.lineTo(this.bounds.xMax - dSize, this.bounds.yMin);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.bounds.xMin, this.bounds.yMax - dSize); ctx.lineTo(this.bounds.xMin, this.bounds.yMax); ctx.lineTo(this.bounds.xMin + dSize, this.bounds.yMax);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.bounds.xMax, this.bounds.yMax - dSize); ctx.lineTo(this.bounds.xMax, this.bounds.yMax); ctx.lineTo(this.bounds.xMax - dSize, this.bounds.yMax);
    ctx.stroke();

    // Center divider
    ctx.strokeStyle = 'rgba(157, 0, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.canvas.width / 2, this.bounds.yMin);
    ctx.lineTo(this.canvas.width / 2, this.bounds.yMax);
    ctx.stroke();
  }

  drawCrateBlocks() {
    const ctx = this.ctx;
    this.blocks.forEach(block => {
      ctx.save();
      // Draw shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(block.x, block.y + 4, block.radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw crate body
      const grad = ctx.createRadialGradient(block.x, block.y, 2, block.x, block.y, block.radius);
      grad.addColorStop(0, '#a07040'); // lighter brown center
      grad.addColorStop(1, '#503010'); // darker brown border
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#2d1808';
      ctx.lineWidth = 3;
      
      ctx.beginPath();
      ctx.arc(block.x, block.y, block.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner details: an X to make it look like a crate
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const r = block.radius * 0.7071;
      ctx.moveTo(block.x - r, block.y - r);
      ctx.lineTo(block.x + r, block.y + r);
      ctx.moveTo(block.x + r, block.y - r);
      ctx.lineTo(block.x - r, block.y + r);
      ctx.stroke();
      
      // Draw a glowing outline to indicate time decay
      const lifePct = block.life / 900;
      ctx.strokeStyle = `rgba(157, 0, 255, ${lifePct * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(block.x, block.y, block.radius + 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });
  }

  drawThunderboltWarnings() {
    const ctx = this.ctx;
    this.thunderbolts.forEach(bolt => {
      ctx.save();
      const maxD = bolt.maxDelay || 36;
      const progress = Math.max(0, Math.min(1, 1 - (bolt.delay / maxD)));
      
      // Color by element
      const elemColors = {
        fire: '#ff5500', ice: '#00ccff', lightning: '#ffe600',
        earth: '#39ff14', water: '#3399ff', wind: '#e0e0e0'
      };
      const ringColor = elemColors[bolt.element] || '#ffe600';
      
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 14;
      ctx.shadowColor = ringColor;
      ctx.globalAlpha = progress * 0.7;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Filling circle
      ctx.globalAlpha = progress * 0.18;
      ctx.fillStyle = ringColor;
      ctx.beginPath();
      ctx.arc(bolt.x, bolt.y, bolt.radius * progress, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Crosshair
      ctx.strokeStyle = `rgba(255, 255, 255, ${progress})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bolt.x - 12, bolt.y); ctx.lineTo(bolt.x + 12, bolt.y);
      ctx.moveTo(bolt.x, bolt.y - 12); ctx.lineTo(bolt.x, bolt.y + 12);
      ctx.stroke();
      
      ctx.restore();
    });
  }

  drawProjectiles() {
    const ctx = this.ctx;
    this.projectiles.forEach(p => {
      ctx.save();
      ctx.shadowBlur = p.radius * 2;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawWizardEntity(wiz) {
    const ctx = this.ctx;

    // Decaying local hit flash
    if (wiz.hitFlash > 0 && !window.networkManager.isHost) {
      wiz.hitFlash--;
    }
    
    // Draw solid white flash when hit
    if (wiz.hitFlash > 0) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(wiz.x, wiz.y, wiz.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(wiz.x, wiz.y + 18, wiz.radius * 0.9, wiz.radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = wiz.stun > 0 ? 8 : 15;
    ctx.shadowColor = wiz.color;
    ctx.fillStyle = wiz.stun > 0 ? '#555566' : wiz.color;
    
    ctx.beginPath();
    ctx.arc(wiz.x, wiz.y, wiz.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(wiz.x, wiz.y, wiz.radius * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Wizard brim cap
    ctx.save();
    ctx.fillStyle = '#0f0c1d';
    ctx.strokeStyle = wiz.stun > 0 ? '#444' : wiz.color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 5;
    ctx.shadowColor = wiz.color;
    
    ctx.beginPath();
    ctx.ellipse(wiz.x, wiz.y - 12, wiz.radius * 0.9, wiz.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(wiz.x - wiz.radius * 0.6, wiz.y - 13);
    ctx.quadraticCurveTo(wiz.x - wiz.radius * 0.2, wiz.y - 28, wiz.x, wiz.y - 34);
    ctx.quadraticCurveTo(wiz.x + wiz.radius * 0.4, wiz.y - 26, wiz.x + wiz.radius * 0.6, wiz.y - 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();

    // Hexagonal Shield bubble
    if (wiz.shield > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(157, 0, 255, 0.85)';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#9d00ff';
      
      const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.04;
      ctx.fillStyle = 'rgba(157, 0, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(wiz.x, wiz.y, wiz.radius * 1.8 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      ctx.strokeStyle = 'rgba(157, 0, 255, 0.18)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const angle = (i * 60) * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(wiz.x, wiz.y);
        ctx.lineTo(wiz.x + Math.cos(angle) * wiz.radius * 1.8 * pulse, wiz.y + Math.sin(angle) * wiz.radius * 1.8 * pulse);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // --- Solid Jagged Lightning Bolt drawing utility ---

  generateJaggedPath(x, startY, endY, steps) {
    const path = [];
    const dy = (endY - startY) / steps;
    let lx = x;
    for (let i = 0; i <= steps; i++) {
      const ly = startY + i * dy;
      const rx = (i === 0 || i === steps) ? x : lx + (Math.random() - 0.5) * 35;
      path.push({ x: rx, y: ly });
      lx = rx;
    }
    return path;
  }

  drawLightningBolts() {
    const ctx = this.ctx;
    for (let i = this.activeBolts.length - 1; i >= 0; i--) {
      const bolt = this.activeBolts[i];
      bolt.life--;
      if (bolt.life <= 0) {
        this.activeBolts.splice(i, 1);
        continue;
      }
      
      ctx.save();
      const alpha = bolt.life / 15;
      ctx.strokeStyle = `rgba(255, 230, 0, ${alpha})`;
      ctx.shadowColor = '#ffe600';
      
      ctx.lineWidth = 6 * alpha;
      ctx.shadowBlur = 20 * alpha;
      ctx.beginPath();
      ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
      for (let j = 1; j < bolt.segments.length; j++) {
        ctx.lineTo(bolt.segments[j].x, bolt.segments[j].y);
      }
      ctx.stroke();
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2 * alpha;
      ctx.shadowBlur = 5 * alpha;
      ctx.beginPath();
      ctx.moveTo(bolt.segments[0].x, bolt.segments[0].y);
      for (let j = 1; j < bolt.segments.length; j++) {
        ctx.lineTo(bolt.segments[j].x, bolt.segments[j].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  drawChatBubbles() {
    const ctx = this.ctx;
    this.activeChats.forEach(chat => {
      const targetWiz = chat.target === 'host' ? this.players.host : this.players.client;
      
      ctx.save();
      ctx.font = "bold 13px 'Space Grotesk', sans-serif";
      const textWidth = ctx.measureText(chat.text).width;
      const padX = 10;
      const padY = 6;
      const bubbleW = textWidth + padX * 2;
      const bubbleH = 22 + padY * 2;
      
      const bx = targetWiz.x - bubbleW / 2;
      const by = targetWiz.y - 68;
      
      ctx.fillStyle = 'rgba(20, 14, 40, 0.95)';
      ctx.strokeStyle = targetWiz.color;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      
      ctx.beginPath();
      ctx.roundRect(bx, by, bubbleW, bubbleH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(targetWiz.x - 6, by + bubbleH);
      ctx.lineTo(targetWiz.x, by + bubbleH + 6);
      ctx.lineTo(targetWiz.x + 6, by + bubbleH);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(targetWiz.x - 6, by + bubbleH);
      ctx.lineTo(targetWiz.x, by + bubbleH + 6);
      ctx.lineTo(targetWiz.x + 6, by + bubbleH);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(chat.text, targetWiz.x, by + bubbleH / 2);
      ctx.restore();
    });
  }

  syncHUDBarIndicators() {
    const host = this.players.host;
    const client = this.players.client;

    // Health bars scale to maxHealth (levels increase HP)
    const hMaxHost = host.maxHealth || 100;
    const hMaxClient = client.maxHealth || 100;

    document.getElementById('p1-health-bar').style.width = `${Math.max(0, (host.health / hMaxHost) * 100)}%`;
    document.getElementById('p1-health-text').textContent = `${Math.round(host.health)} / ${hMaxHost}`;
    document.getElementById('p1-mana-bar').style.width = `${Math.max(0, host.mana)}%`;
    document.getElementById('p1-mana-text').textContent = `${Math.round(host.mana)} / 100`;

    document.getElementById('p2-health-bar').style.width = `${Math.max(0, (client.health / hMaxClient) * 100)}%`;
    document.getElementById('p2-health-text').textContent = `${Math.round(client.health)} / ${hMaxClient}`;
    document.getElementById('p2-mana-bar').style.width = `${Math.max(0, client.mana)}%`;
    document.getElementById('p2-mana-text').textContent = `${Math.round(client.mana)} / 100`;

    document.getElementById('game-timer').textContent = Math.max(0, this.roundTimer);

    const localWizard = window.networkManager.isHost ? host : client;
    
    // Sync spell slots 1-5 cooldowns
    for (let slotKey = 1; slotKey <= 5; slotKey++) {
      const cdOverlay = document.getElementById(`cd-${slotKey}`);
      const currentCD = localWizard.cooldowns[slotKey];
      const spells = ElementSpells[localWizard.element];
      const maxCD = spells && spells[slotKey] ? spells[slotKey].cooldown : 60;
      
      if (cdOverlay) {
        if (currentCD > 0) {
          cdOverlay.style.height = `${(currentCD / maxCD) * 100}%`;
        } else {
          cdOverlay.style.height = '0%';
        }
      }
    }

    // Sync Potion and Wall counts & slot cooldown overlays (6 & 7)
    const cd6 = document.getElementById('cd-6');
    const count6 = document.getElementById('count-6');
    if (count6) count6.textContent = localWizard.potionsLeft;
    if (cd6) {
      cd6.style.height = localWizard.cooldowns[6] > 0 ? `${(localWizard.cooldowns[6] / 60) * 100}%` : '0%';
    }

    const cd7 = document.getElementById('cd-7');
    const count7 = document.getElementById('count-7');
    if (count7) count7.textContent = localWizard.wallsLeft;
    if (cd7) {
      cd7.style.height = localWizard.cooldowns[7] > 0 ? `${(localWizard.cooldowns[7] / 60) * 100}%` : '0%';
    }
  }
}

window.gameEngine = new GameEngine();
