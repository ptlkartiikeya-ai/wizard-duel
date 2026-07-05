/**
 * Spellcasters' Arena: Graphics & Particle Effects Engine
 */

class Particle {
  constructor({ x, y, vx, vy, color, size, life, drag = 0.98, gravity = 0, shape = 'circle', fadeSpeed = null }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.initialSize = size;
    this.life = life; // in frames
    this.maxLife = life;
    this.drag = drag;
    this.gravity = gravity;
    this.shape = shape;
    this.alpha = 1;
    this.fadeSpeed = fadeSpeed || (1 / life);
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 0.1;
  }

  update() {
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.angle += this.spin;
    
    this.life--;
    this.alpha = Math.max(0, this.life * this.fadeSpeed);
    
    // Shrink slightly over time
    this.size = this.initialSize * (this.life / this.maxLife);
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = this.size * 1.5;
    ctx.shadowColor = this.color;

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(Math.cos((18 + i * 72) * Math.PI / 180) * this.size,
                   Math.sin((18 + i * 72) * Math.PI / 180) * this.size);
        ctx.lineTo(Math.cos((54 + i * 72) * Math.PI / 180) * (this.size / 2),
                   Math.sin((54 + i * 72) * Math.PI / 180) * (this.size / 2));
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.shape === 'spark') {
      ctx.fillRect(-this.size / 2, -this.size * 2, this.size, this.size * 4);
    } else if (this.shape === 'shard') {
      ctx.beginPath();
      ctx.moveTo(-this.size, 0);
      ctx.lineTo(0, -this.size * 1.5);
      ctx.lineTo(this.size, 0);
      ctx.lineTo(0, this.size * 0.5);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
}

class FloatingText {
  constructor(x, y, text, color, size = 16, style = 'bold') {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.style = style;
    this.vy = -1.2 - Math.random() * 0.8;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.life = 60; // 1 second
    this.maxLife = 60;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy *= 0.96; // decelerate upward movement
    this.life--;
  }

  draw(ctx) {
    ctx.save();
    const alpha = this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.font = `${this.style} ${this.size}px 'Space Grotesk', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

class Shockwave {
  constructor(x, y, color, maxRadius = 60, duration = 30) {
    this.x = x;
    this.y = y;
    this.radius = 5;
    this.maxRadius = maxRadius;
    this.color = color;
    this.life = duration;
    this.maxLife = duration;
  }

  update() {
    this.life--;
    const progress = 1 - (this.life / this.maxLife);
    this.radius = 5 + (this.maxRadius - 5) * progress;
  }

  draw(ctx) {
    ctx.save();
    const alpha = this.life / this.maxLife;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3 * alpha;
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 20 * alpha;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.shockwaves = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }

  update() {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update();
      if (p.life <= 0 || p.size <= 0.1 || p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.update();
      if (t.life <= 0) {
        this.texts.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      this.shockwaves[i].update();
      if (this.shockwaves[i].life <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update screen shake
    if (this.shakeDuration > 0) {
      this.shakeDuration--;
      if (this.shakeDuration === 0) {
        this.shakeIntensity = 0;
      }
    }
  }

  draw(ctx) {
    // Draw shockwaves first (behind players/particles)
    this.shockwaves.forEach(s => s.draw(ctx));

    // Draw all particles
    this.particles.forEach(p => p.draw(ctx));
    
    // Draw all text overlays
    this.texts.forEach(t => t.draw(ctx));
  }

  triggerShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  applyShake(ctx) {
    if (this.shakeIntensity > 0 && this.shakeDuration > 0) {
      const dx = (Math.random() - 0.5) * this.shakeIntensity;
      const dy = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(dx, dy);
    }
  }

  spawnText(x, y, text, color, size, style) {
    this.texts.push(new FloatingText(x, y, text, color, size, style));
  }

  spawnShockwave(x, y, color, maxRadius, duration) {
    this.shockwaves.push(new Shockwave(x, y, color, maxRadius, duration));
  }

  // --- Spell Visuals Generators ---

  spawnMovementDust(x, y, color) {
    if (Math.random() < 0.25) {
      this.particles.push(new Particle({
        x: x + (Math.random() - 0.5) * 12,
        y: y + 16,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.1 - Math.random() * 0.4,
        color: color,
        size: 1.5 + Math.random() * 2,
        life: 15 + Math.random() * 10,
        drag: 0.96,
        gravity: -0.01
      }));
    }
  }

  spawnFireballTrail(x, y, angle) {
    // Fire trail
    this.particles.push(new Particle({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: -Math.cos(angle) * 1.5 + (Math.random() - 0.5) * 0.8,
      vy: -Math.sin(angle) * 1.5 + (Math.random() - 0.5) * 0.8,
      color: `hsl(${15 + Math.random() * 30}, 100%, ${50 + Math.random() * 20}%)`,
      size: 4 + Math.random() * 6,
      life: 20 + Math.random() * 15,
      drag: 0.95,
      gravity: -0.05
    }));

    // Smoke trail
    if (Math.random() < 0.4) {
      this.particles.push(new Particle({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.2,
        color: '#4a4453',
        size: 3 + Math.random() * 5,
        life: 30 + Math.random() * 20,
        drag: 0.97,
        gravity: -0.02
      }));
    }
  }

  spawnFireExplosion(x, y) {
    this.triggerShake(9, 14);
    this.spawnShockwave(x, y, '#ff5500', 80, 20);
    
    // Core shockwave particle
    this.particles.push(new Particle({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      color: '#ffdd77',
      size: 20,
      life: 15,
      drag: 1,
      fadeSpeed: 0.1
    }));

    // Spark burst
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 7;
      this.particles.push(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: `hsl(${10 + Math.random() * 35}, 100%, 55%)`,
        size: 4 + Math.random() * 6,
        life: 25 + Math.random() * 20,
        drag: 0.94,
        gravity: 0.05
      }));
    }

    // Smoke puff
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.particles.push(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#2a2533',
        size: 8 + Math.random() * 12,
        life: 40 + Math.random() * 30,
        drag: 0.92,
        gravity: -0.04
      }));
    }
  }

  spawnIceTrail(x, y, angle) {
    // Sparkling snowflakes
    this.particles.push(new Particle({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      vx: -Math.cos(angle) * 0.5 + (Math.random() - 0.5) * 0.5,
      vy: -Math.sin(angle) * 0.5 + (Math.random() - 0.5) * 0.5,
      color: `hsl(${190 + Math.random() * 20}, 100%, ${75 + Math.random() * 20}%)`,
      size: 2 + Math.random() * 4,
      life: 15 + Math.random() * 15,
      drag: 0.96,
      shape: 'star'
    }));

    // Ice mist
    if (Math.random() < 0.6) {
      this.particles.push(new Particle({
        x: x,
        y: y,
        vx: -Math.cos(angle) * 0.8,
        vy: -Math.sin(angle) * 0.8,
        color: 'rgba(180, 230, 255, 0.4)',
        size: 5 + Math.random() * 7,
        life: 20 + Math.random() * 10,
        drag: 0.95
      }));
    }
  }

  spawnIceShatter(x, y) {
    this.triggerShake(6, 10);
    this.spawnShockwave(x, y, '#aaddff', 65, 18);
    
    // Shards explosion
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: '#aaddff',
        size: 3 + Math.random() * 5,
        life: 30 + Math.random() * 15,
        drag: 0.96,
        shape: 'shard'
      }));
    }

    // Ice dust
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push(new Particle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: 'rgba(230, 245, 255, 0.6)',
        size: 2 + Math.random() * 3,
        life: 20 + Math.random() * 15,
        drag: 0.95,
        shape: 'star'
      }));
    }
  }

  spawnLightningCharge(x, y) {
    // Charging sparks around target area
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 30 + Math.random() * 20;
      const sx = x + Math.cos(angle) * radius;
      const sy = y + Math.sin(angle) * radius;
      
      this.particles.push(new Particle({
        x: sx,
        y: sy,
        vx: (x - sx) * 0.1, // fly towards center
        vy: (y - sy) * 0.1,
        color: '#ffdf00',
        size: 2 + Math.random() * 3,
        life: 10 + Math.random() * 5,
        drag: 1,
        shape: 'circle'
      }));
    }
  }

  spawnLightningStrike(x, startY, endY) {
    this.triggerShake(14, 20);
    this.spawnShockwave(x, endY, '#ffe600', 90, 22);

    // Strike columns (simulated sparks along the strike path)
    const steps = 12;
    const dy = (endY - startY) / steps;
    let lx = x;
    
    for (let i = 0; i <= steps; i++) {
      const ly = startY + i * dy;
      const rx = lx + (Math.random() - 0.5) * 20;
      
      // Spawn persistent sparks down the bolt path
      this.particles.push(new Particle({
        x: rx,
        y: ly,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        color: '#ffffff',
        size: 5 + Math.random() * 4,
        life: 10 + Math.random() * 8,
        drag: 0.9,
        shape: 'spark'
      }));

      this.particles.push(new Particle({
        x: rx,
        y: ly,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        color: '#b1a0ff',
        size: 3 + Math.random() * 4,
        life: 15 + Math.random() * 10,
        drag: 0.92,
        shape: 'spark'
      }));

      lx = rx;
    }

    // Ground splash
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      this.particles.push(new Particle({
        x: x,
        y: endY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.5 - 2, // fly out horizontally
        color: '#ffea00',
        size: 2 + Math.random() * 4,
        life: 25 + Math.random() * 20,
        drag: 0.93,
        shape: 'spark'
      }));
    }
  }

  spawnHealBurst(x, y) {
    // Green floating leaf/spark auras rising up
    for (let i = 0; i < 25; i++) {
      const rx = x + (Math.random() - 0.5) * 40;
      const ry = y + (Math.random() - 0.5) * 40;
      this.particles.push(new Particle({
        x: rx,
        y: ry,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -1.5 - Math.random() * 2, // float straight up
        color: `hsl(${100 + Math.random() * 40}, 100%, 60%)`,
        size: 3 + Math.random() * 4,
        life: 30 + Math.random() * 20,
        drag: 0.98,
        gravity: -0.05,
        shape: 'star'
      }));
    }
  }

  spawnEarthShatter(x, y) {
    this.triggerShake(8, 12);
    this.spawnShockwave(x, y, '#8b5a2b', 70, 18);
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      this.particles.push(new Particle({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        color: Math.random() < 0.5 ? '#8b5a2b' : '#6e473b',
        size: 4 + Math.random() * 5,
        life: 30 + Math.random() * 20,
        drag: 0.94,
        gravity: 0.12,
        shape: 'shard'
      }));
    }
  }

  spawnWaterGeyser(x, y) {
    this.triggerShake(5, 10);
    this.spawnShockwave(x, y, '#3399ff', 60, 16);
    for (let i = 0; i < 30; i++) {
      this.particles.push(new Particle({
        x: x + (Math.random() - 0.5) * 15,
        y: y,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -3.5 - Math.random() * 5, // shoot up column
        color: Math.random() < 0.4 ? '#ffffff' : '#00bfff',
        size: 3 + Math.random() * 6,
        life: 20 + Math.random() * 15,
        drag: 0.96,
        gravity: 0.15
      }));
    }
  }

  spawnWindVortex(x, y) {
    this.triggerShake(4, 8);
    this.spawnShockwave(x, y, '#ffffff', 75, 20);
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * 15;
      this.particles.push(new Particle({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: -Math.sin(angle) * (2 + Math.random() * 2), // orbital velocity
        vy: Math.cos(angle) * (0.5 + Math.random() * 1) - 1.0,
        color: '#e0e0e0',
        size: 2 + Math.random() * 3,
        life: 25 + Math.random() * 15,
        drag: 0.98,
        gravity: -0.04,
        shape: 'star'
      }));
    }
  }

  spawnWizardAura(x, y, color) {
    // Subtle passive glowing aura rising from feet
    if (Math.random() < 0.25) {
      this.particles.push(new Particle({
        x: x + (Math.random() - 0.5) * 30,
        y: y + 20 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.5 - Math.random() * 0.8,
        color: color,
        size: 2 + Math.random() * 3,
        life: 25 + Math.random() * 15,
        drag: 0.98,
        gravity: -0.02
      }));
    }
  }

  spawnStunStars(x, y) {
    // Spawning spinning stars above the wizard's head
    if (Math.random() < 0.2) {
      const angle = Math.random() * Math.PI * 2;
      const rx = x + Math.cos(angle) * 15;
      const ry = y - 35 + Math.sin(angle) * 5;
      this.particles.push(new Particle({
        x: rx,
        y: ry,
        vx: -Math.sin(angle) * 1, // orbit movement
        vy: Math.cos(angle) * 0.3,
        color: '#ffdf00',
        size: 3,
        life: 20,
        drag: 1,
        shape: 'star'
      }));
    }
  }
}

// Attach it to the window global namespace for access across scripts
window.ParticleSystem = ParticleSystem;
window.Particle = Particle;
