export class MarioGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;

    this.gameOver = false;
    this.autoRestart = false;

    this.gravity = 1400;
    this.score = 0;
    this.bestScore = 0;
    this.coins = 0;

    this.groundY = canvas.height - 60;
    this.cameraX = 0;

    this.player = {
      x: 80,
      y: 0,
      vx: 0,
      vy: 0,
      w: 28,
      h: 36,
      onGround: false,
      facing: 1,
      walkFrame: 0,
      walkTimer: 0,
      dead: false,
    };

    this.jumpForce = -580;
    this.moveSpeed = 220;
    this.maxSpeed = 260;

    this.platforms = [];
    this.coinItems = [];
    this.enemies = [];
    this.pipes = [];
    this.flagX = 0;
    this.won = false;

    this.particles = [];
  }

  reset() {
    this.gameOver = false;
    this.won = false;
    this.score = 0;
    this.coins = 0;
    this.cameraX = 0;
    this.particles = [];

    const p = this.player;
    p.x = 80;
    p.y = this.groundY - p.h;
    p.vx = 0;
    p.vy = 0;
    p.onGround = true;
    p.dead = false;
    p.facing = 1;
    p.walkFrame = 0;
    p.walkTimer = 0;

    this.buildLevel();
    this.setStatus("Mario: ← → to move, SPACE/↑ to jump. Collect coins, stomp enemies!");
  }

  buildLevel() {
    this.platforms = [];
    this.coinItems = [];
    this.enemies = [];
    this.pipes = [];

    const g = this.groundY;

    this.platforms.push({ x: 0, y: g, w: 5000, h: 80, type: "ground" });

    const gaps = [
      { start: 900, width: 80 },
      { start: 1800, width: 100 },
      { start: 2700, width: 80 },
    ];
    for (const gap of gaps) {
      this.platforms[0] = null;
    }
    this.platforms = [
      { x: 0, y: g, w: 900, h: 80, type: "ground" },
      { x: 980, y: g, w: 820, h: 80, type: "ground" },
      { x: 1900, y: g, w: 800, h: 80, type: "ground" },
      { x: 2780, y: g, w: 1500, h: 80, type: "ground" },
    ];

    const floatingPlatforms = [
      { x: 250, y: g - 120, w: 130, h: 26 },
      { x: 450, y: g - 90, w: 100, h: 26 },
      { x: 600, y: g - 160, w: 100, h: 26 },
      { x: 930, y: g - 80, w: 70, h: 26 },
      { x: 1100, y: g - 130, w: 130, h: 26 },
      { x: 1350, y: g - 100, w: 100, h: 26 },
      { x: 1550, y: g - 160, w: 130, h: 26 },
      { x: 1830, y: g - 70, w: 70, h: 26 },
      { x: 2000, y: g - 140, w: 130, h: 26 },
      { x: 2250, y: g - 110, w: 100, h: 26 },
      { x: 2500, y: g - 170, w: 130, h: 26 },
      { x: 2850, y: g - 130, w: 100, h: 26 },
      { x: 3100, y: g - 100, w: 130, h: 26 },
      { x: 3400, y: g - 150, w: 100, h: 26 },
    ];
    for (const fp of floatingPlatforms) {
      this.platforms.push({ ...fp, type: "brick" });
    }

    const questionBlocks = [
      { x: 300, y: g - 170 },
      { x: 700, y: g - 130 },
      { x: 1150, y: g - 180 },
      { x: 1600, y: g - 210 },
      { x: 2050, y: g - 190 },
      { x: 2550, y: g - 220 },
      { x: 3150, y: g - 150 },
    ];
    for (const qb of questionBlocks) {
      this.platforms.push({ x: qb.x, y: qb.y, w: 32, h: 32, type: "question", hit: false });
    }

    this.coinItems = [
      { x: 310, y: g - 210, collected: false },
      { x: 480, y: g - 130, collected: false },
      { x: 620, y: g - 200, collected: false },
      { x: 710, y: g - 170, collected: false },
      { x: 1120, y: g - 170, collected: false },
      { x: 1160, y: g - 170, collected: false },
      { x: 1380, y: g - 140, collected: false },
      { x: 1580, y: g - 200, collected: false },
      { x: 1620, y: g - 200, collected: false },
      { x: 2020, y: g - 180, collected: false },
      { x: 2060, y: g - 180, collected: false },
      { x: 2280, y: g - 150, collected: false },
      { x: 2520, y: g - 210, collected: false },
      { x: 2560, y: g - 210, collected: false },
      { x: 2880, y: g - 170, collected: false },
      { x: 3130, y: g - 140, collected: false },
      { x: 3430, y: g - 190, collected: false },
    ];

    this.enemies = [
      { x: 400, y: g - 28, w: 28, h: 28, vx: -60, alive: true, type: "goomba" },
      { x: 750, y: g - 28, w: 28, h: 28, vx: -50, alive: true, type: "goomba" },
      { x: 1050, y: g - 28, w: 28, h: 28, vx: -70, alive: true, type: "goomba" },
      { x: 1300, y: g - 28, w: 28, h: 28, vx: 55, alive: true, type: "goomba" },
      { x: 1700, y: g - 28, w: 28, h: 28, vx: -60, alive: true, type: "goomba" },
      { x: 2100, y: g - 28, w: 28, h: 28, vx: -65, alive: true, type: "goomba" },
      { x: 2400, y: g - 28, w: 28, h: 28, vx: 50, alive: true, type: "goomba" },
      { x: 2900, y: g - 28, w: 28, h: 28, vx: -55, alive: true, type: "goomba" },
      { x: 3200, y: g - 28, w: 28, h: 28, vx: -60, alive: true, type: "goomba" },
      { x: 3500, y: g - 40, w: 28, h: 40, vx: -40, alive: true, type: "koopa" },
    ];

    this.pipes = [
      { x: 500, y: g - 60, w: 48, h: 60 },
      { x: 1200, y: g - 80, w: 48, h: 80 },
      { x: 2200, y: g - 70, w: 48, h: 70 },
      { x: 3000, y: g - 60, w: 48, h: 60 },
    ];

    this.flagX = 3800;
  }

  onKeyDown(e) {
    if (this.gameOver || this.won) {
      if (e.code === "Space" || e.code === "Enter") this.reset();
      return;
    }
    if ((e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") && this.player.onGround) {
      e.preventDefault();
      this.player.vy = this.jumpForce;
      this.player.onGround = false;
    }
  }

  onKeyUp() {}

  rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  isOnGround(px, py, pw, ph) {
    for (const plat of this.platforms) {
      if (!plat) continue;
      if (
        px + pw > plat.x &&
        px < plat.x + plat.w &&
        py + ph >= plat.y &&
        py + ph <= plat.y + 8
      ) {
        return plat;
      }
    }
    for (const pipe of this.pipes) {
      if (
        px + pw > pipe.x &&
        px < pipe.x + pipe.w &&
        py + ph >= pipe.y &&
        py + ph <= pipe.y + 8
      ) {
        return pipe;
      }
    }
    return null;
  }

  update(dt, keyState) {
    if (this.gameOver || this.won) return;

    const p = this.player;
    if (p.dead) return;

    let moveDir = 0;
    if (keyState.has("ArrowLeft") || keyState.has("KeyA")) moveDir = -1;
    if (keyState.has("ArrowRight") || keyState.has("KeyD")) moveDir = 1;

    if (moveDir !== 0) {
      p.vx += moveDir * this.moveSpeed * dt * 5;
      p.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, p.vx));
      p.facing = moveDir;
      p.walkTimer += dt;
      if (p.walkTimer > 0.1) {
        p.walkTimer = 0;
        p.walkFrame = (p.walkFrame + 1) % 3;
      }
    } else {
      p.vx *= 0.85;
      if (Math.abs(p.vx) < 5) p.vx = 0;
      p.walkFrame = 0;
    }

    p.vy += this.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    p.onGround = false;
    for (const plat of this.platforms) {
      if (!plat) continue;
      if (this.rectOverlap(p.x, p.y, p.w, p.h, plat.x, plat.y, plat.w, plat.h)) {
        const fromTop = p.y + p.h - plat.y;
        const fromBottom = (plat.y + plat.h) - p.y;
        const fromLeft = p.x + p.w - plat.x;
        const fromRight = (plat.x + plat.w) - p.x;
        const min = Math.min(fromTop, fromBottom, fromLeft, fromRight);

        if (min === fromTop && p.vy >= 0) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.onGround = true;
        } else if (min === fromBottom && p.vy < 0) {
          p.y = plat.y + plat.h;
          p.vy = 100;
          if (plat.type === "question" && !plat.hit) {
            plat.hit = true;
            this.score += 100;
            this.coins++;
            this.spawnCoinParticles(plat.x + plat.w / 2, plat.y);
          }
        } else if (min === fromLeft) {
          p.x = plat.x - p.w;
          p.vx = 0;
        } else if (min === fromRight) {
          p.x = plat.x + plat.w;
          p.vx = 0;
        }
      }
    }

    for (const pipe of this.pipes) {
      if (this.rectOverlap(p.x, p.y, p.w, p.h, pipe.x, pipe.y, pipe.w, pipe.h)) {
        const fromTop = p.y + p.h - pipe.y;
        const fromBottom = (pipe.y + pipe.h) - p.y;
        const fromLeft = p.x + p.w - pipe.x;
        const fromRight = (pipe.x + pipe.w) - p.x;
        const min = Math.min(fromTop, fromBottom, fromLeft, fromRight);

        if (min === fromTop && p.vy >= 0) {
          p.y = pipe.y - p.h;
          p.vy = 0;
          p.onGround = true;
        } else if (min === fromLeft) {
          p.x = pipe.x - p.w;
          p.vx = 0;
        } else if (min === fromRight) {
          p.x = pipe.x + pipe.w;
          p.vx = 0;
        }
      }
    }

    if (p.y > this.canvas.height + 100) {
      this.die();
      return;
    }

    for (const coin of this.coinItems) {
      if (coin.collected) continue;
      if (this.rectOverlap(p.x, p.y, p.w, p.h, coin.x - 10, coin.y - 10, 20, 20)) {
        coin.collected = true;
        this.coins++;
        this.score += 50;
        this.spawnCoinParticles(coin.x, coin.y);
      }
    }

    for (const e of this.enemies) {
      if (!e.alive) continue;
      e.x += e.vx * dt;

      let onPlat = false;
      for (const plat of this.platforms) {
        if (!plat) continue;
        if (e.x + e.w > plat.x && e.x < plat.x + plat.w && e.y + e.h >= plat.y && e.y + e.h <= plat.y + 8) {
          onPlat = true;
        }
        if (this.rectOverlap(e.x, e.y, e.w, e.h, plat.x, plat.y, plat.w, plat.h)) {
          if (e.x + e.w - plat.x < 10 || plat.x + plat.w - e.x < 10) {
            e.vx = -e.vx;
          }
        }
      }
      for (const pipe of this.pipes) {
        if (this.rectOverlap(e.x, e.y, e.w, e.h, pipe.x, pipe.y, pipe.w, pipe.h)) {
          e.vx = -e.vx;
        }
      }

      if (!onPlat) {
        for (const plat of this.platforms) {
          if (!plat) continue;
          if (e.x + e.w > plat.x && e.x < plat.x + plat.w) {
            if (e.y + e.h < plat.y) {
              e.y = plat.y - e.h;
              onPlat = true;
            }
          }
        }
      }

      if (this.rectOverlap(p.x, p.y, p.w, p.h, e.x, e.y, e.w, e.h)) {
        if (p.vy > 0 && p.y + p.h < e.y + e.h * 0.6) {
          e.alive = false;
          p.vy = -350;
          this.score += 100;
          this.spawnStompParticles(e.x + e.w / 2, e.y + e.h);
        } else {
          this.die();
          return;
        }
      }
    }

    if (p.x >= this.flagX) {
      this.won = true;
      this.score += 1000;
      this.bestScore = Math.max(this.bestScore, this.score);
      this.setStatus(
        `Mario: You Win! Score ${this.score}, Best ${this.bestScore} — SPACE to play again`
      );
      return;
    }

    this.cameraX = Math.max(0, p.x - this.canvas.width * 0.35);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 300 * dt;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }

    this.setStatus(
      `Mario: Score ${this.score} | Coins ${this.coins} | Best ${this.bestScore}`
    );
  }

  die() {
    this.player.dead = true;
    this.gameOver = true;
    this.bestScore = Math.max(this.bestScore, this.score);
    this.setStatus(
      `Mario: Game Over! Score ${this.score}, Best ${this.bestScore} — SPACE to restart`
    );
  }

  spawnCoinParticles(x, y) {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * 80,
        vy: Math.sin(a) * 80 - 120,
        life: 0.5,
        maxLife: 0.5,
        color: "#fbbf24",
        size: 3,
      });
    }
  }

  spawnStompParticles(x, y) {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + Math.random() * Math.PI;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * 100,
        vy: Math.sin(a) * 60 - 50,
        life: 0.4,
        maxLife: 0.4,
        color: "#a3a3a3",
        size: 3,
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.drawSky(ctx, w, h);

    ctx.save();
    ctx.translate(-this.cameraX, 0);

    this.drawClouds(ctx);
    this.drawHills(ctx, h);
    this.drawPlatforms(ctx);
    this.drawPipes(ctx);
    this.drawCoins(ctx);
    this.drawEnemies(ctx);
    this.drawFlag(ctx);
    this.drawPlayer(ctx);
    this.drawParticles(ctx);

    ctx.restore();

    this.drawHUD(ctx, w);
    if (this.gameOver) this.drawOverlay(ctx, w, h);
    if (this.won) this.drawWinOverlay(ctx, w, h);
  }

  drawSky(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#5c94fc");
    g.addColorStop(0.7, "#a8d0f8");
    g.addColorStop(1, "#5da832");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  drawClouds(ctx) {
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const cloudPositions = [
      [100, 80], [400, 50], [700, 90], [1000, 60],
      [1400, 80], [1800, 55], [2200, 75], [2600, 50],
      [3000, 85], [3400, 60],
    ];
    for (const [cx, cy] of cloudPositions) {
      ctx.beginPath();
      ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      ctx.arc(cx + 28, cy - 6, 20, 0, Math.PI * 2);
      ctx.arc(cx + 50, cy, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHills(ctx, h) {
    ctx.fillStyle = "#4a8c2a";
    const hillPositions = [
      [150, 70], [500, 50], [900, 65], [1300, 55],
      [1700, 70], [2100, 50], [2500, 60], [3000, 55], [3500, 65],
    ];
    for (const [hx, hr] of hillPositions) {
      ctx.beginPath();
      ctx.arc(hx, this.groundY, hr, Math.PI, 0);
      ctx.fill();
    }
  }

  drawPlatforms(ctx) {
    for (const plat of this.platforms) {
      if (!plat) continue;
      if (plat.type === "ground") {
        ctx.fillStyle = "#c2854a";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.fillStyle = "#5da832";
        ctx.fillRect(plat.x, plat.y, plat.w, 8);
      } else if (plat.type === "brick") {
        ctx.fillStyle = "#c2854a";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = "#8b5e34";
        ctx.lineWidth = 1;
        const brickW = 26;
        for (let bx = plat.x; bx < plat.x + plat.w; bx += brickW) {
          ctx.strokeRect(bx, plat.y, Math.min(brickW, plat.x + plat.w - bx), plat.h);
        }
      } else if (plat.type === "question") {
        ctx.fillStyle = plat.hit ? "#8b7355" : "#fbbf24";
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = "#b8860b";
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
        if (!plat.hit) {
          ctx.fillStyle = "#b8860b";
          ctx.font = "bold 18px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("?", plat.x + plat.w / 2, plat.y + plat.h / 2);
        }
      }
    }
  }

  drawPipes(ctx) {
    for (const pipe of this.pipes) {
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(pipe.x, pipe.y, pipe.w, pipe.h);
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(pipe.x - 4, pipe.y, pipe.w + 8, 16);
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(pipe.x + 4, pipe.y + 16, 8, pipe.h - 16);
      ctx.strokeStyle = "#15803d";
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x, pipe.y, pipe.w, pipe.h);
      ctx.strokeRect(pipe.x - 4, pipe.y, pipe.w + 8, 16);
    }
  }

  drawCoins(ctx) {
    const time = performance.now() / 1000;
    for (const coin of this.coinItems) {
      if (coin.collected) continue;
      const bob = Math.sin(time * 3 + coin.x) * 4;
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.ellipse(coin.x, coin.y + bob, 8, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", coin.x, coin.y + bob);
    }
  }

  drawEnemies(ctx) {
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.type === "goomba") {
        ctx.fillStyle = "#92400e";
        ctx.beginPath();
        ctx.arc(e.x + e.w / 2, e.y + e.h / 2, e.w / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#78350f";
        ctx.fillRect(e.x + 4, e.y + e.h - 8, e.w - 8, 8);

        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(e.x + 8, e.y + e.h / 2 - 2, 4, 0, Math.PI * 2);
        ctx.arc(e.x + e.w - 8, e.y + e.h / 2 - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(e.x + 8, e.y + e.h / 2 - 1, 2, 0, Math.PI * 2);
        ctx.arc(e.x + e.w - 8, e.y + e.h / 2 - 1, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.x + 5, e.y + e.h / 2 - 6);
        ctx.lineTo(e.x + 10, e.y + e.h / 2 - 4);
        ctx.moveTo(e.x + e.w - 5, e.y + e.h / 2 - 6);
        ctx.lineTo(e.x + e.w - 10, e.y + e.h / 2 - 4);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(e.x + 2, e.y + e.h - 12, e.w - 4, 12);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(e.x + 8, e.y + 10, 4, 0, Math.PI * 2);
        ctx.arc(e.x + e.w - 8, e.y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(e.x + 8, e.y + 10, 2, 0, Math.PI * 2);
        ctx.arc(e.x + e.w - 8, e.y + 10, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawFlag(ctx) {
    const fx = this.flagX;
    const gy = this.groundY;

    ctx.fillStyle = "#737373";
    ctx.fillRect(fx, gy - 200, 6, 200);

    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.moveTo(fx + 6, gy - 200);
    ctx.lineTo(fx + 50, gy - 180);
    ctx.lineTo(fx + 6, gy - 160);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(fx + 3, gy - 202, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPlayer(ctx) {
    const p = this.player;
    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    if (p.facing < 0) ctx.scale(-1, 1);

    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * 0.45);

    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-p.w / 2 - 2, -p.h / 2, p.w + 6, 8);

    ctx.fillStyle = "#fcd9b6";
    ctx.fillRect(-p.w / 2 + 4, -p.h / 2 + 6, p.w - 8, 14);

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-p.w / 2 + 10, -p.h / 2 + 9, 3, 3);

    ctx.fillStyle = "#fcd9b6";
    ctx.fillRect(-p.w / 2 + 14, -p.h / 2 + 13, 4, 3);

    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(-p.w / 2, -p.h / 2 + p.h * 0.45, p.w, p.h * 0.3);

    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-p.w / 2 + 2, -p.h / 2 + p.h * 0.38, 6, p.h * 0.2);
    ctx.fillRect(p.w / 2 - 8, -p.h / 2 + p.h * 0.38, 6, p.h * 0.2);

    ctx.fillStyle = "#92400e";
    const legOffset = p.onGround && p.walkFrame === 1 ? 2 : 0;
    ctx.fillRect(-p.w / 2 + 2, p.h / 2 - 10 + legOffset, 10, 10);
    ctx.fillRect(p.w / 2 - 12, p.h / 2 - 10 - legOffset, 10, 10);

    ctx.restore();
  }

  drawParticles(ctx) {
    for (const pt of this.particles) {
      const alpha = pt.life / pt.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawHUD(ctx, w) {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, w, 36);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`SCORE: ${this.score}`, 12, 18);

    ctx.textAlign = "center";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`COINS: ${this.coins}`, w / 2, 18);

    ctx.textAlign = "right";
    ctx.fillStyle = "#fff";
    ctx.fillText(`BEST: ${this.bestScore}`, w - 12, 18);
  }

  drawOverlay(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
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
    ctx.fillText("Press SPACE to play again", w / 2, h / 2 + 50);
  }

  drawWinOverlay(ctx, w, h) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 40px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("YOU WIN!", w / 2, h / 2 - 30);

    ctx.font = "22px sans-serif";
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(`Score: ${this.score} | Coins: ${this.coins}`, w / 2, h / 2 + 14);

    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Press SPACE to play again", w / 2, h / 2 + 50);
  }
}
