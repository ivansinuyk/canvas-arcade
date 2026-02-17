export class FlappyBirdGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;

    this.bird = {
      x: canvas.width * 0.25,
      y: canvas.height / 2,
      vy: 0,
      radius: 18,
    };

    this.gravity = 900;
    this.flapVelocity = -350;
    this.pipeSpeed = 180;
    this.pipeGap = 150;
    this.pipeWidth = 70;
    this.pipes = [];

    this.score = 0;
    this.bestScore = 0;
    this.gameOver = false;
    this.autoRestart = false;
    this.started = false;
  }

  reset() {
    this.bird.y = this.canvas.height / 2;
    this.bird.vy = 0;
    this.pipes = [];
    this.score = 0;
    this.gameOver = false;
    this.started = false;

    const spacing = 260;
    for (let i = 0; i < 4; i++) {
      this.spawnPipe(this.canvas.width + i * spacing);
    }

    this.setStatus("Flappy: Press SPACE or click to flap.");
  }

  spawnPipe(x) {
    const margin = 40;
    const h = this.canvas.height;
    const gapCenter = Math.random() * (h - this.pipeGap - margin * 2) + margin + this.pipeGap / 2;

    this.pipes.push({
      x,
      gapCenter,
      passed: false,
    });
  }

  flap() {
    if (this.gameOver) {
      this.reset();
      return;
    }
    this.started = true;
    this.bird.vy = this.flapVelocity;
  }

  onKeyDown(e) {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      this.flap();
    }
  }

  onKeyUp() {}

  update(dt) {
    if (!this.started || this.gameOver) return;

    const b = this.bird;
    b.vy += this.gravity * dt;
    b.y += b.vy * dt;

    for (const pipe of this.pipes) {
      pipe.x -= this.pipeSpeed * dt;
    }

    if (this.pipes.length) {
      const first = this.pipes[0];
      if (first.x + this.pipeWidth < -10) {
        this.pipes.shift();
        const lastX = this.pipes[this.pipes.length - 1].x;
        this.spawnPipe(lastX + 260);
      }
    }

    for (const pipe of this.pipes) {
      if (!pipe.passed && pipe.x + this.pipeWidth < b.x) {
        pipe.passed = true;
        this.score += 1;
      }
    }

    const topCollision = b.y - b.radius <= 0;
    const bottomCollision = b.y + b.radius >= this.canvas.height;

    let pipeCollision = false;
    for (const pipe of this.pipes) {
      const withinX = b.x + b.radius > pipe.x && b.x - b.radius < pipe.x + this.pipeWidth;
      const topPipeBottom = pipe.gapCenter - this.pipeGap / 2;
      const bottomPipeTop = pipe.gapCenter + this.pipeGap / 2;
      if (withinX && (b.y - b.radius < topPipeBottom || b.y + b.radius > bottomPipeTop)) {
        pipeCollision = true;
        break;
      }
    }

    if (topCollision || bottomCollision || pipeCollision) {
      this.gameOver = true;
      this.bestScore = Math.max(this.bestScore, this.score);
      this.setStatus(
        `Flappy: Game over! Score ${this.score}, Best ${this.bestScore} — press SPACE to restart.`
      );
    } else {
      this.setStatus(`Flappy: Score ${this.score}, Best ${this.bestScore}`);
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#22c1c3");
    gradient.addColorStop(1, "#0f172a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    const clouds = [
      { x: 40, y: 80, r: 26 },
      { x: 90, y: 70, r: 30 },
      { x: 130, y: 80, r: 22 },
      { x: w - 120, y: 120, r: 28 },
      { x: w - 70, y: 110, r: 22 },
    ];
    for (const c of clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPipes() {
    const ctx = this.ctx;
    ctx.fillStyle = "#22c55e";
    ctx.strokeStyle = "#14532d";
    ctx.lineWidth = 3;

    for (const pipe of this.pipes) {
      const x = pipe.x;
      const w = this.pipeWidth;
      const topBottom = pipe.gapCenter - this.pipeGap / 2;
      const bottomTop = pipe.gapCenter + this.pipeGap / 2;

      ctx.beginPath();
      ctx.rect(x, 0, w, topBottom);
      ctx.rect(x - 4, topBottom - 18, w + 8, 18);
      ctx.rect(x, bottomTop, w, this.canvas.height - bottomTop);
      ctx.rect(x - 4, bottomTop, w + 8, 18);
      ctx.fill();
      ctx.stroke();
    }
  }

  drawBird() {
    const ctx = this.ctx;
    const b = this.bird;

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.max(-0.4, Math.min(0.6, b.vy / 300)));

    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.ellipse(0, 0, b.radius + 4, b.radius, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(-6, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(-6, -4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#eab308";
    ctx.beginPath();
    ctx.moveTo(8, -2);
    ctx.lineTo(16, 0);
    ctx.lineTo(8, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.ellipse(-6, 10, 10, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  draw() {
    this.drawBackground();
    this.drawPipes();
    this.drawBird();
  }
}

