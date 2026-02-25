export class AngryBirdGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;

    this.gameOver = false;
    this.autoRestart = false;

    this.gravity = 600;
    this.score = 0;
    this.bestScore = 0;
    this.birdsLeft = 0;
    this.level = 1;

    this.sling = { x: 100, y: canvas.height - 160 };
    this.slingRadius = 80;

    this.bird = null;
    this.dragging = false;
    this.dragPos = { x: 0, y: 0 };

    this.blocks = [];
    this.pigs = [];
    this.debris = [];
    this.trail = [];

    this.launched = false;
    this.settled = false;
    this.settleTimer = 0;

    this.groundY = canvas.height - 60;
  }

  reset() {
    this.gameOver = false;
    this.score = 0;
    this.level = 1;
    this.debris = [];
    this.trail = [];
    this.loadLevel();
    this.setStatus("Angry Bird: Click & drag bird to aim, release to launch!");
  }

  loadLevel() {
    this.birdsLeft = 3;
    this.launched = false;
    this.settled = false;
    this.settleTimer = 0;
    this.debris = [];
    this.trail = [];
    this.blocks = [];
    this.pigs = [];

    this.bird = {
      x: this.sling.x,
      y: this.sling.y,
      vx: 0,
      vy: 0,
      r: 16,
      active: false,
    };

    const baseX = 300 + (this.level - 1) * 10;
    const g = this.groundY;
    const bw = 24;
    const bh = 50;

    if (this.level % 3 === 1) {
      this.blocks.push({ x: baseX, y: g - bh, w: bw, h: bh, hp: 2 });
      this.blocks.push({ x: baseX + 60, y: g - bh, w: bw, h: bh, hp: 2 });
      this.blocks.push({ x: baseX - 10, y: g - bh - 20, w: 100, h: 18, hp: 1 });
      this.pigs.push({ x: baseX + 30, y: g - 20, r: 18, hp: 1 });
    } else if (this.level % 3 === 2) {
      this.blocks.push({ x: baseX, y: g - bh, w: bw, h: bh, hp: 2 });
      this.blocks.push({ x: baseX + 80, y: g - bh, w: bw, h: bh, hp: 2 });
      this.blocks.push({ x: baseX - 10, y: g - bh - 18, w: 120, h: 18, hp: 1 });
      this.blocks.push({ x: baseX + 20, y: g - bh - 18 - bh, w: bw, h: bh, hp: 2 });
      this.blocks.push({ x: baseX + 60, y: g - bh - 18 - bh, w: bw, h: bh, hp: 2 });
      this.blocks.push({ x: baseX + 10, y: g - bh - 18 - bh - 18, w: 80, h: 18, hp: 1 });
      this.pigs.push({ x: baseX + 40, y: g - 20, r: 18, hp: 1 });
      this.pigs.push({ x: baseX + 40, y: g - bh - 18 - 20, r: 16, hp: 1 });
    } else {
      for (let i = 0; i < 3; i++) {
        const ox = baseX + i * 55;
        this.blocks.push({ x: ox, y: g - bh, w: bw, h: bh, hp: 2 });
      }
      this.blocks.push({ x: baseX - 10, y: g - bh - 18, w: 170, h: 18, hp: 1 });
      this.pigs.push({ x: baseX + 25, y: g - 20, r: 18, hp: 1 });
      this.pigs.push({ x: baseX + 80, y: g - 20, r: 18, hp: 1 });
      this.pigs.push({ x: baseX + 55, y: g - bh - 18 - 20, r: 16, hp: 1 });
    }
  }

  getCanvasPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  onMouseDown(e) {
    if (this.gameOver) {
      this.reset();
      return;
    }
    if (this.launched) return;
    const pos = this.getCanvasPos(e);
    const dx = pos.x - this.bird.x;
    const dy = pos.y - this.bird.y;
    if (Math.sqrt(dx * dx + dy * dy) < 40) {
      this.dragging = true;
      this.dragPos = pos;
    }
  }

  onMouseMove(e) {
    if (!this.dragging) return;
    const pos = this.getCanvasPos(e);
    const dx = pos.x - this.sling.x;
    const dy = pos.y - this.sling.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.slingRadius) {
      this.bird.x = this.sling.x + (dx / dist) * this.slingRadius;
      this.bird.y = this.sling.y + (dy / dist) * this.slingRadius;
    } else {
      this.bird.x = pos.x;
      this.bird.y = pos.y;
    }
    this.dragPos = pos;
  }

  onKeyDown(e) {
    if (this.gameOver && (e.code === "Space" || e.code === "Enter")) {
      this.reset();
    }
    if (this.settled && e.code === "Space") {
      this.nextBirdOrLevel();
    }
  }

  onKeyUp() {}

  launch() {
    if (!this.dragging) return;
    this.dragging = false;
    const power = 5.5;
    this.bird.vx = (this.sling.x - this.bird.x) * power;
    this.bird.vy = (this.sling.y - this.bird.y) * power;
    this.bird.active = true;
    this.launched = true;
    this.settled = false;
    this.settleTimer = 0;
    this.trail = [];
  }

  nextBirdOrLevel() {
    if (this.pigs.length === 0) {
      this.level++;
      this.score += this.birdsLeft * 500;
      this.loadLevel();
      this.setStatus(`Angry Bird: Level ${this.level}! Click & drag to aim.`);
      return;
    }

    this.birdsLeft--;
    if (this.birdsLeft <= 0) {
      this.gameOver = true;
      this.bestScore = Math.max(this.bestScore, this.score);
      this.setStatus(
        `Angry Bird: Game Over! Score ${this.score}, Best ${this.bestScore} — click to restart`
      );
      return;
    }

    this.launched = false;
    this.settled = false;
    this.trail = [];
    this.bird = {
      x: this.sling.x,
      y: this.sling.y,
      vx: 0,
      vy: 0,
      r: 16,
      active: false,
    };
    this.setStatus(
      `Angry Bird: Lv${this.level} | Score ${this.score} | Birds left: ${this.birdsLeft}`
    );
  }

  spawnDebris(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 160;
      this.debris.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 100,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  update(dt) {
    if (this.gameOver) return;

    if (this.dragging) {
      window.addEventListener(
        "mouseup",
        () => this.launch(),
        { once: true }
      );
    }

    const b = this.bird;
    if (b.active) {
      b.vy += this.gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (this.trail.length === 0 || Math.abs(b.x - this.trail[this.trail.length - 1].x) > 8) {
        this.trail.push({ x: b.x, y: b.y });
        if (this.trail.length > 60) this.trail.shift();
      }

      if (b.y + b.r > this.groundY) {
        b.y = this.groundY - b.r;
        b.vy *= -0.3;
        b.vx *= 0.7;
        if (Math.abs(b.vy) < 20) b.vy = 0;
      }
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.5; }
      if (b.x + b.r > this.canvas.width) { b.x = this.canvas.width - b.r; b.vx = -Math.abs(b.vx) * 0.5; }

      for (let i = this.blocks.length - 1; i >= 0; i--) {
        const bl = this.blocks[i];
        if (this.circleRect(b.x, b.y, b.r, bl.x, bl.y, bl.w, bl.h)) {
          bl.hp--;
          this.score += 50;
          b.vx *= 0.5;
          b.vy *= 0.5;
          if (bl.hp <= 0) {
            this.spawnDebris(bl.x + bl.w / 2, bl.y + bl.h / 2, "#d4a574");
            this.blocks.splice(i, 1);
            this.score += 100;
          }
        }
      }

      for (let i = this.pigs.length - 1; i >= 0; i--) {
        const p = this.pigs[i];
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < b.r + p.r) {
          p.hp--;
          this.score += 200;
          if (p.hp <= 0) {
            this.spawnDebris(p.x, p.y, "#4ade80");
            this.pigs.splice(i, 1);
            this.score += 500;
          }
          b.vx *= 0.6;
          b.vy *= 0.6;
        }
      }

      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      const outOfBounds = b.x > this.canvas.width + 50 || b.y > this.canvas.height + 50;
      if (speed < 10 || outOfBounds) {
        this.settleTimer += dt;
        if (this.settleTimer > 0.8) {
          this.settled = true;
          b.active = false;
          if (this.pigs.length === 0) {
            this.nextBirdOrLevel();
          } else {
            this.setStatus(
              `Angry Bird: Lv${this.level} | Score ${this.score} | Birds: ${this.birdsLeft} — SPACE for next bird`
            );
          }
        }
      } else {
        this.settleTimer = 0;
      }
    }

    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.vy += 400 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      if (d.life <= 0) this.debris.splice(i, 1);
    }

    if (!this.launched && !this.gameOver) {
      this.setStatus(
        `Angry Bird: Lv${this.level} | Score ${this.score} | Birds: ${this.birdsLeft} — Drag bird to aim!`
      );
    }
  }

  circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < cr * cr;
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.drawBackground(ctx, w, h);
    this.drawSlingshot(ctx);
    this.drawTrail(ctx);
    this.drawBlocks(ctx);
    this.drawPigs(ctx);
    this.drawBird(ctx);
    this.drawDebris(ctx);
    this.drawHUD(ctx, w);

    if (this.gameOver) this.drawOverlay(ctx, w, h);
  }

  drawBackground(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#87ceeb");
    g.addColorStop(0.6, "#b8e4f0");
    g.addColorStop(0.8, "#7ec850");
    g.addColorStop(1, "#4a8c2a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#5da832";
    ctx.fillRect(0, this.groundY, w, h - this.groundY);
    ctx.fillStyle = "#4a8c2a";
    ctx.fillRect(0, this.groundY, w, 4);

    ctx.fillStyle = "rgba(255,255,255,0.7)";
    const clouds = [
      [60, 50, 30], [95, 42, 22], [130, 52, 26],
      [320, 70, 28], [355, 60, 20], [385, 72, 24],
    ];
    for (const [cx, cy, cr] of clouds) {
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSlingshot(ctx) {
    const s = this.sling;
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(s.x - 6, s.y - 40, 6, 60);
    ctx.fillRect(s.x + 6, s.y - 40, 6, 60);

    ctx.fillStyle = "#a0522d";
    ctx.beginPath();
    ctx.arc(s.x - 3, s.y - 42, 6, 0, Math.PI * 2);
    ctx.arc(s.x + 9, s.y - 42, 6, 0, Math.PI * 2);
    ctx.fill();

    if (this.dragging && !this.launched) {
      ctx.strokeStyle = "#4a3728";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(s.x - 3, s.y - 38);
      ctx.lineTo(this.bird.x, this.bird.y);
      ctx.lineTo(s.x + 9, s.y - 38);
      ctx.stroke();
    }
  }

  drawTrail(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = i / this.trail.length * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBlocks(ctx) {
    for (const bl of this.blocks) {
      if (bl.h > 30) {
        const g = ctx.createLinearGradient(bl.x, bl.y, bl.x + bl.w, bl.y);
        g.addColorStop(0, "#d4a574");
        g.addColorStop(1, "#c49464");
        ctx.fillStyle = g;
      } else {
        const g = ctx.createLinearGradient(bl.x, bl.y, bl.x, bl.y + bl.h);
        g.addColorStop(0, "#d4a574");
        g.addColorStop(1, "#c49464");
        ctx.fillStyle = g;
      }
      ctx.fillRect(bl.x, bl.y, bl.w, bl.h);
      ctx.strokeStyle = "#a07850";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bl.x, bl.y, bl.w, bl.h);

      if (bl.hp <= 1) {
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bl.x + 3, bl.y + 3);
        ctx.lineTo(bl.x + bl.w / 2, bl.y + bl.h / 2);
        ctx.lineTo(bl.x + bl.w - 3, bl.y + 3);
        ctx.stroke();
      }
    }
  }

  drawPigs(ctx) {
    for (const p of this.pigs) {
      ctx.fillStyle = "#4ade80";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x - 5, p.y - 3, 5, 0, Math.PI * 2);
      ctx.arc(p.x + 5, p.y - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1a1a";
      ctx.beginPath();
      ctx.arc(p.x - 4, p.y - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(p.x + 6, p.y - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#3cb371";
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 6, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2d8659";
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y + 5, 1.5, 0, Math.PI * 2);
      ctx.arc(p.x + 2, p.y + 5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawBird(ctx) {
    const b = this.bird;
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(b.x, b.y + 2, b.r - 3, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(b.x - 5, b.y - 3, 5, 0, Math.PI * 2);
    ctx.arc(b.x + 5, b.y - 3, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(b.x - 4, b.y - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(b.x + 6, b.y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(b.x + b.r - 2, b.y);
    ctx.lineTo(b.x + b.r + 8, b.y - 3);
    ctx.lineTo(b.x + b.r + 8, b.y + 3);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.moveTo(b.x - 3, b.y - b.r + 2);
    ctx.lineTo(b.x, b.y - b.r - 8);
    ctx.lineTo(b.x + 3, b.y - b.r + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#b91c1c";
    ctx.beginPath();
    ctx.moveTo(b.x + 1, b.y - b.r + 2);
    ctx.lineTo(b.x + 5, b.y - b.r - 6);
    ctx.lineTo(b.x + 6, b.y - b.r + 2);
    ctx.closePath();
    ctx.fill();
  }

  drawDebris(ctx) {
    for (const d of this.debris) {
      const alpha = d.life / d.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = d.color;
      ctx.fillRect(d.x - d.size / 2, d.y - d.size / 2, d.size, d.size);
    }
    ctx.globalAlpha = 1;
  }

  drawHUD(ctx, w) {
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#1a1a1a";
    ctx.fillText(`Lv ${this.level}`, 10, 10);

    ctx.textAlign = "right";
    ctx.fillText(`Score: ${this.score}`, w - 10, 10);

    ctx.textAlign = "center";
    for (let i = 0; i < this.birdsLeft; i++) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(w / 2 - 20 + i * 22, 20, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawOverlay(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", w / 2, h / 2 - 30);

    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`Score: ${this.score}`, w / 2, h / 2 + 14);

    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("Click to play again", w / 2, h / 2 + 50);
  }
}
