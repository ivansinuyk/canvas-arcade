export class RacerGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;

    this.roadWidth = canvas.width * 0.7;
    this.laneCount = 3;
    this.laneWidth = this.roadWidth / this.laneCount;
    this.roadX = (canvas.width - this.roadWidth) / 2;

    this.player = {
      lane: 1,
      targetLane: 1,
      x: 0,
      y: canvas.height - 140,
      width: this.laneWidth * 0.5,
      height: 70,
      color: "#38bdf8",
    };

    this.obstacles = [];
    this.scroll = 0;
    this.speed = 260;
    this.maxSpeed = 520;
    this.acceleration = 12;
    this.minSpeed = 140;
    this.laneChangeSpeed = this.laneWidth * 6;

    this.spawnTimer = 0;
    this.spawnInterval = 1.1;

    this.score = 0;
    this.bestScore = 0;
    this.gameOver = false;
    this.autoRestart = false;
  }

  laneToX(laneIndex) {
    const centerOfLane = this.roadX + laneIndex * this.laneWidth + this.laneWidth / 2;
    return centerOfLane - this.player.width / 2;
  }

  reset() {
    this.speed = 260;
    this.spawnTimer = 0;
    this.obstacles = [];
    this.scroll = 0;
    this.score = 0;
    this.gameOver = false;

    this.player.lane = 1;
    this.player.targetLane = this.player.lane;
    this.player.x = this.laneToX(this.player.lane);

    this.setStatus(
      "Racer: ← → change lanes (smooth), ↑/↓ adjust speed, avoid other cars."
    );
  }

  onKeyDown(e) {
    if (this.gameOver) {
      if (e.code === "Space" || e.code === "Enter") {
        this.reset();
      }
      return;
    }

    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      const nextLane = Math.max(0, this.player.targetLane - 1);
      this.player.targetLane = nextLane;
      this.player.lane = nextLane;
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      const nextLane = Math.min(this.laneCount - 1, this.player.targetLane + 1);
      this.player.targetLane = nextLane;
      this.player.lane = nextLane;
    } else if (e.code === "ArrowUp" || e.code === "KeyW") {
      this.speed = Math.min(this.maxSpeed, this.speed + 80);
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
      this.speed = Math.max(this.minSpeed, this.speed - 80);
    }
  }

  onKeyUp() {}

  update(dt) {
    if (this.gameOver) return;

    this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);
    this.scroll += this.speed * dt;
    this.score += this.speed * dt * 0.05;

    // Smoothly slide toward target lane position for softer movement
    const targetLane =
      this.player.targetLane !== undefined ? this.player.targetLane : this.player.lane;
    const targetX = this.laneToX(targetLane);
    const dx = targetX - this.player.x;
    const step = this.laneChangeSpeed * dt;
    if (Math.abs(dx) <= step) {
      this.player.x = targetX;
    } else {
      this.player.x += Math.sign(dx) * step;
    }

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.spawnInterval;
      const lane = Math.floor(Math.random() * this.laneCount);
      const width = this.player.width * 1.05;
      const height = this.player.height * (0.9 + Math.random() * 0.3);
      const y = -height - 20;
      const x = this.roadX + lane * this.laneWidth + (this.laneWidth - width) / 2;

      const colors = ["#f97316", "#a855f7", "#22c55e", "#eab308"];
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.obstacles.push({ x, y, width, height, color });
    }

    for (const o of this.obstacles) {
      o.y += this.speed * dt;
    }
    this.obstacles = this.obstacles.filter((o) => o.y < this.canvas.height + 100);

    for (const o of this.obstacles) {
      if (this.rectsOverlap(this.player, o)) {
        this.gameOver = true;
        this.bestScore = Math.max(this.bestScore, Math.floor(this.score));
        this.setStatus(
          `Racer: Crash! Score ${Math.floor(this.score)}, Best ${this.bestScore} — press SPACE to restart.`
        );
        return;
      }
    }

    this.setStatus(
      `Racer: Score ${Math.floor(this.score)}, Best ${this.bestScore}, Speed ${Math.floor(
        this.speed
      )}`
    );
  }

  rectsOverlap(a, b) {
    return !(
      a.x + a.width < b.x ||
      a.x > b.x + b.width ||
      a.y + a.height < b.y ||
      a.y > b.y + b.height
    );
  }

  drawRoad() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, "#020617");
    bgGrad.addColorStop(1, "#0f172a");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#1f2937";
    ctx.beginPath();
    ctx.moveTo(this.roadX - 40, 0);
    ctx.lineTo(this.roadX + this.roadWidth + 40, 0);
    ctx.lineTo(this.roadX + this.roadWidth, h);
    ctx.lineTo(this.roadX, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(this.roadX, 0);
    ctx.lineTo(this.roadX, h);
    ctx.moveTo(this.roadX + this.roadWidth, 0);
    ctx.lineTo(this.roadX + this.roadWidth, h);
    ctx.stroke();

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 18]);
    const dashOffset = -(this.scroll % 72);
    for (let i = 1; i < this.laneCount; i++) {
      const x = this.roadX + i * this.laneWidth;
      ctx.beginPath();
      ctx.setLineDash([18, 18]);
      ctx.lineDashOffset = dashOffset;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.moveTo(this.roadX - 60, h);
    ctx.lineTo(0, h);
    ctx.lineTo(0, h - 40);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(this.roadX + this.roadWidth + 60, h);
    ctx.lineTo(w, h);
    ctx.lineTo(w, h - 40);
    ctx.closePath();
    ctx.fill();
  }

  drawCar(car) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(car.x + car.width / 2, car.y + car.height / 2);

    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-car.width / 2, -car.height / 2, car.width, car.height, 10);
    ctx.fill();

    ctx.fillStyle = "#020617";
    const wheelW = car.width * 0.18;
    const wheelH = car.height * 0.22;
    ctx.beginPath();
    ctx.roundRect(-car.width / 2 - wheelW * 0.8, -car.height / 3, wheelW, wheelH, 3);
    ctx.roundRect(-car.width / 2 - wheelW * 0.8, car.height / 3 - wheelH, wheelW, wheelH, 3);
    ctx.roundRect(car.width / 2 - wheelW * 0.2, -car.height / 3, wheelW, wheelH, 3);
    ctx.roundRect(car.width / 2 - wheelW * 0.2, car.height / 3 - wheelH, wheelW, wheelH, 3);
    ctx.fill();

    ctx.fillStyle = "rgba(248, 250, 252, 0.85)";
    const cabinW = car.width * 0.7;
    const cabinH = car.height * 0.4;
    ctx.beginPath();
    ctx.roundRect(-cabinW / 2, -car.height / 2 + 6, cabinW, cabinH, 8);
    ctx.fill();

    ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
    ctx.beginPath();
    ctx.arc(0, cabinH / 2 + 6, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  draw() {
    this.drawRoad();
    for (const o of this.obstacles) {
      this.drawCar(o);
    }
    this.drawCar(this.player);
  }
}

