export class BreakoutGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;

    this.gameOver = false;
    this.autoRestart = false;

    this.score = 0;
    this.bestScore = 0;
    this.lives = 3;
    this.level = 1;
    this.launched = false;

    this.paddleW = 90;
    this.paddleH = 14;
    this.paddleX = 0;
    this.paddleSpeed = 520;

    this.ballR = 7;
    this.ballX = 0;
    this.ballY = 0;
    this.ballVX = 0;
    this.ballVY = 0;
    this.baseBallSpeed = 340;

    this.brickRows = 0;
    this.brickCols = 0;
    this.brickW = 0;
    this.brickH = 22;
    this.brickPad = 4;
    this.brickOffsetTop = 60;
    this.brickOffsetSide = 12;
    this.bricks = [];

    this.particles = [];

    this.rowColors = [
      ["#ef4444", "#dc2626"],
      ["#f97316", "#ea580c"],
      ["#eab308", "#ca8a04"],
      ["#22c55e", "#16a34a"],
      ["#3b82f6", "#2563eb"],
      ["#8b5cf6", "#7c3aed"],
      ["#ec4899", "#db2777"],
      ["#14b8a6", "#0d9488"],
    ];

    this.reset();
  }

  reset() {
    const w = this.canvas.width;

    this.gameOver = false;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.launched = false;
    this.particles = [];

    this.paddleX = (w - this.paddleW) / 2;

    this.buildBricks();
    this.resetBall();

    this.setStatus("Breakout: ← → or A/D to move. SPACE to launch ball.");
  }

  buildBricks() {
    const w = this.canvas.width;
    const rows = Math.min(5 + this.level, 8);
    const cols = 8;

    this.brickRows = rows;
    this.brickCols = cols;
    this.brickW = (w - 2 * this.brickOffsetSide - (cols - 1) * this.brickPad) / cols;
    this.bricks = [];

    for (let r = 0; r < rows; r++) {
      this.bricks[r] = [];
      for (let c = 0; c < cols; c++) {
        const hits = r < 2 && this.level > 1 ? 2 : 1;
        this.bricks[r][c] = { alive: true, hits };
      }
    }
  }

  resetBall() {
    this.launched = false;
    this.ballX = this.paddleX + this.paddleW / 2;
    this.ballY = this.canvas.height - 40 - this.paddleH - this.ballR;
    this.ballVX = 0;
    this.ballVY = 0;
  }

  launchBall() {
    if (this.launched) return;
    this.launched = true;
    const speed = this.baseBallSpeed + (this.level - 1) * 20;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    this.ballVX = Math.cos(angle) * speed;
    this.ballVY = Math.sin(angle) * speed;
  }

  onKeyDown(e) {
    if (this.gameOver) {
      if (e.code === "Space" || e.code === "Enter") {
        this.reset();
      }
      return;
    }
    if (e.code === "Space") {
      this.launchBall();
    }
  }

  onKeyUp() {}

  spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.4 + Math.random() * 0.3,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  getBrickRect(r, c) {
    const x = this.brickOffsetSide + c * (this.brickW + this.brickPad);
    const y = this.brickOffsetTop + r * (this.brickH + this.brickPad);
    return { x, y, w: this.brickW, h: this.brickH };
  }

  update(dt, keyState) {
    if (this.gameOver) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Paddle movement
    if (keyState.has("ArrowLeft") || keyState.has("KeyA")) {
      this.paddleX -= this.paddleSpeed * dt;
    }
    if (keyState.has("ArrowRight") || keyState.has("KeyD")) {
      this.paddleX += this.paddleSpeed * dt;
    }
    this.paddleX = Math.max(0, Math.min(w - this.paddleW, this.paddleX));

    // Stick ball to paddle before launch
    if (!this.launched) {
      this.ballX = this.paddleX + this.paddleW / 2;
      this.ballY = h - 40 - this.paddleH - this.ballR;
      this.updateParticles(dt);
      this.setStatus(
        `Breakout: Lv${this.level} | Score ${this.score} | Best ${this.bestScore} | Lives ${this.lives} — SPACE to launch`
      );
      return;
    }

    // Ball movement
    this.ballX += this.ballVX * dt;
    this.ballY += this.ballVY * dt;

    // Wall collisions
    if (this.ballX - this.ballR < 0) {
      this.ballX = this.ballR;
      this.ballVX = Math.abs(this.ballVX);
    }
    if (this.ballX + this.ballR > w) {
      this.ballX = w - this.ballR;
      this.ballVX = -Math.abs(this.ballVX);
    }
    if (this.ballY - this.ballR < 0) {
      this.ballY = this.ballR;
      this.ballVY = Math.abs(this.ballVY);
    }

    // Ball fell below screen
    if (this.ballY - this.ballR > h) {
      this.lives--;
      if (this.lives <= 0) {
        this.handleGameOver();
      } else {
        this.resetBall();
        this.setStatus(
          `Breakout: Lost a life! ${this.lives} left. SPACE to launch.`
        );
      }
      this.updateParticles(dt);
      return;
    }

    // Paddle collision
    const paddleTop = h - 40 - this.paddleH;
    if (
      this.ballVY > 0 &&
      this.ballY + this.ballR >= paddleTop &&
      this.ballY + this.ballR <= paddleTop + this.paddleH + 4 &&
      this.ballX >= this.paddleX - this.ballR &&
      this.ballX <= this.paddleX + this.paddleW + this.ballR
    ) {
      this.ballY = paddleTop - this.ballR;

      const hitPos = (this.ballX - this.paddleX) / this.paddleW;
      const angle = -Math.PI / 2 + (hitPos - 0.5) * 1.2;
      const speed = Math.sqrt(this.ballVX ** 2 + this.ballVY ** 2);
      this.ballVX = Math.cos(angle) * speed;
      this.ballVY = Math.sin(angle) * speed;

      if (Math.abs(this.ballVY) < speed * 0.3) {
        this.ballVY = -speed * 0.3 * Math.sign(this.ballVY || -1);
      }
    }

    // Brick collisions
    let bricksLeft = 0;
    for (let r = 0; r < this.brickRows; r++) {
      for (let c = 0; c < this.brickCols; c++) {
        const brick = this.bricks[r][c];
        if (!brick.alive) continue;
        bricksLeft++;

        const rect = this.getBrickRect(r, c);
        if (
          this.ballX + this.ballR > rect.x &&
          this.ballX - this.ballR < rect.x + rect.w &&
          this.ballY + this.ballR > rect.y &&
          this.ballY - this.ballR < rect.y + rect.h
        ) {
          brick.hits--;
          if (brick.hits <= 0) {
            brick.alive = false;
            bricksLeft--;
            this.score += 10 * this.level;
            const colors = this.rowColors[r % this.rowColors.length];
            this.spawnParticles(
              rect.x + rect.w / 2,
              rect.y + rect.h / 2,
              colors[0],
              8
            );
          }

          const overlapLeft = this.ballX + this.ballR - rect.x;
          const overlapRight = rect.x + rect.w - (this.ballX - this.ballR);
          const overlapTop = this.ballY + this.ballR - rect.y;
          const overlapBottom = rect.y + rect.h - (this.ballY - this.ballR);
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

          if (minOverlap === overlapLeft || minOverlap === overlapRight) {
            this.ballVX = -this.ballVX;
          } else {
            this.ballVY = -this.ballVY;
          }
          break;
        }
      }
    }

    // Level cleared
    if (bricksLeft === 0) {
      this.level++;
      this.buildBricks();
      this.resetBall();
      this.setStatus(
        `Breakout: Level ${this.level}! Score ${this.score} — SPACE to launch`
      );
      this.updateParticles(dt);
      return;
    }

    this.updateParticles(dt);

    this.setStatus(
      `Breakout: Lv${this.level} | Score ${this.score} | Best ${this.bestScore} | Lives ${"♥".repeat(this.lives)}`
    );
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  handleGameOver() {
    this.gameOver = true;
    this.bestScore = Math.max(this.bestScore, this.score);
    this.setStatus(
      `Breakout: Game Over! Score ${this.score}, Best ${this.bestScore} — SPACE to restart`
    );
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.drawBackground(ctx, w, h);
    this.drawBricks(ctx);
    this.drawPaddle(ctx, w, h);
    this.drawBall(ctx);
    this.drawParticles(ctx);
    this.drawLives(ctx, w);

    if (this.gameOver) {
      this.drawOverlay(ctx, w, h);
    }
  }

  drawBackground(ctx, w, h) {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0c0a1a");
    g.addColorStop(1, "#1a0a2e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(100, 60, 180, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(w, y + 0.5);
      ctx.stroke();
    }
  }

  drawBricks(ctx) {
    for (let r = 0; r < this.brickRows; r++) {
      for (let c = 0; c < this.brickCols; c++) {
        const brick = this.bricks[r][c];
        if (!brick.alive) continue;

        const rect = this.getBrickRect(r, c);
        const colors = this.rowColors[r % this.rowColors.length];

        const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
        g.addColorStop(0, colors[0]);
        g.addColorStop(1, colors[1]);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 4);
        ctx.fill();

        // Shine highlight
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.roundRect(rect.x + 2, rect.y + 1, rect.w - 4, rect.h / 2, [4, 4, 0, 0]);
        ctx.fill();

        if (brick.hits > 1) {
          ctx.fillStyle = "rgba(255,255,255,0.6)";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("2", rect.x + rect.w / 2, rect.y + rect.h / 2);
        }
      }
    }
  }

  drawPaddle(ctx, w, h) {
    const y = h - 40 - this.paddleH;
    const x = this.paddleX;
    const pw = this.paddleW;
    const ph = this.paddleH;

    const g = ctx.createLinearGradient(x, y, x, y + ph);
    g.addColorStop(0, "#60a5fa");
    g.addColorStop(1, "#2563eb");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, pw, ph, 7);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.roundRect(x + 4, y + 1, pw - 8, ph / 2 - 1, [5, 5, 0, 0]);
    ctx.fill();

    ctx.shadowColor = "#60a5fa";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(96,165,250,0.3)";
    ctx.beginPath();
    ctx.roundRect(x, y, pw, ph, 7);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawBall(ctx) {
    const g = ctx.createRadialGradient(
      this.ballX - 2, this.ballY - 2, 1,
      this.ballX, this.ballY, this.ballR
    );
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.5, "#e0e7ff");
    g.addColorStop(1, "#a5b4fc");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, this.ballR, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = "#818cf8";
    ctx.shadowBlur = 10;
    ctx.fillStyle = "rgba(129,140,248,0.4)";
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, this.ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawLives(ctx, w) {
    ctx.font = "16px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#f87171";
    ctx.fillText("♥".repeat(this.lives), w - 14, 14);
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
}
