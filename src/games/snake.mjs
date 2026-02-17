export class SnakeGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;

    this.cellSize = 24;
    this.cols = Math.floor(canvas.width / this.cellSize);
    this.rows = Math.floor(canvas.height / this.cellSize);

    this.snake = [];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.pendingGrowth = 0;
    this.food = null;

    this.moveInterval = 0.12; // seconds per step
    this.moveTimer = 0;

    this.score = 0;
    this.bestScore = 0;
    this.gameOver = false;
    this.autoRestart = false;

    this.reset();
  }

  reset() {
    this.cols = Math.floor(this.canvas.width / this.cellSize);
    this.rows = Math.floor(this.canvas.height / this.cellSize);

    const startX = Math.floor(this.cols / 2);
    const startY = Math.floor(this.rows / 2);

    this.snake = [
      { x: startX - 1, y: startY },
      { x: startX, y: startY },
    ];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.pendingGrowth = 2;
    this.moveTimer = 0;

    this.score = 0;
    this.gameOver = false;

    this.spawnFood();

    this.setStatus(
      "Snake: ← ↑ → ↓ (or WASD) to move. Eat the fruit, avoid walls and yourself."
    );
  }

  spawnFood() {
    const occupied = new Set(
      this.snake.map((s) => `${s.x},${s.y}`)
    );

    let x;
    let y;
    let tries = 0;

    do {
      x = Math.floor(Math.random() * this.cols);
      y = Math.floor(Math.random() * this.rows);
      tries++;
    } while (occupied.has(`${x},${y}`) && tries < 1000);

    this.food = { x, y };
  }

  onKeyDown(e) {
    if (this.gameOver) {
      if (e.code === "Space" || e.code === "Enter") {
        this.reset();
      }
      return;
    }

    const key = e.code;
    const dir = this.direction;

    if (key === "ArrowUp" || key === "KeyW") {
      if (dir.y !== 1) this.nextDirection = { x: 0, y: -1 };
    } else if (key === "ArrowDown" || key === "KeyS") {
      if (dir.y !== -1) this.nextDirection = { x: 0, y: 1 };
    } else if (key === "ArrowLeft" || key === "KeyA") {
      if (dir.x !== 1) this.nextDirection = { x: -1, y: 0 };
    } else if (key === "ArrowRight" || key === "KeyD") {
      if (dir.x !== -1) this.nextDirection = { x: 1, y: 0 };
    }
  }

  onKeyUp() {}

  step() {
    this.direction = this.nextDirection;

    const head = this.snake[this.snake.length - 1];
    const next = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y,
    };

    // Wall collision
    if (
      next.x < 0 ||
      next.x >= this.cols ||
      next.y < 0 ||
      next.y >= this.rows
    ) {
      this.handleGameOver();
      return;
    }

    // Self collision
    if (this.snake.some((s) => s.x === next.x && s.y === next.y)) {
      this.handleGameOver();
      return;
    }

    // Move snake
    this.snake.push(next);

    // Food
    if (this.food && next.x === this.food.x && next.y === this.food.y) {
      this.score += 10;
      this.pendingGrowth += 2;
      this.spawnFood();
    }

    if (this.pendingGrowth > 0) {
      this.pendingGrowth -= 1;
    } else {
      this.snake.shift();
    }
  }

  handleGameOver() {
    this.gameOver = true;
    this.bestScore = Math.max(this.bestScore, this.score);
    this.setStatus(
      `Snake: Game over! Score ${this.score}, Best ${this.bestScore} — press SPACE to restart.`
    );
  }

  update(dt) {
    if (this.gameOver) return;

    this.moveTimer += dt;
    while (this.moveTimer >= this.moveInterval) {
      this.moveTimer -= this.moveInterval;
      this.step();
      if (this.gameOver) return;
    }

    this.setStatus(`Snake: Score ${this.score}, Best ${this.bestScore}`);
  }

  drawBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#020617");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Subtle grid
    ctx.strokeStyle = "rgba(15,23,42,0.7)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellSize + 0.5, 0);
      ctx.lineTo(x * this.cellSize + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellSize + 0.5);
      ctx.lineTo(w, y * this.cellSize + 0.5);
      ctx.stroke();
    }
  }

  drawFood() {
    if (!this.food) return;
    const ctx = this.ctx;
    const size = this.cellSize;
    const x = this.food.x * size;
    const y = this.food.y * size;

    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.moveTo(cx - 2, cy - size * 0.35);
    ctx.lineTo(cx + 2, cy - size * 0.35 - 8);
    ctx.lineTo(cx + 4, cy - size * 0.35 - 2);
    ctx.closePath();
    ctx.fill();
  }

  drawSnake() {
    const ctx = this.ctx;
    const size = this.cellSize;

    if (!this.snake.length) return;

    for (let i = 0; i < this.snake.length; i++) {
      const segment = this.snake[i];
      const x = segment.x * size;
      const y = segment.y * size;

      const isHead = i === this.snake.length - 1;

      if (isHead) {
        const g = ctx.createLinearGradient(x, y, x, y + size);
        g.addColorStop(0, "#22c55e");
        g.addColorStop(1, "#16a34a");
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = "#15803d";
      }

      ctx.beginPath();
      ctx.roundRect(x + 3, y + 3, size - 6, size - 6, 6);
      ctx.fill();

      if (isHead) {
        ctx.fillStyle = "#e5e7eb";
        ctx.beginPath();
        ctx.arc(x + size * 0.35, y + size * 0.35, 3, 0, Math.PI * 2);
        ctx.arc(x + size * 0.65, y + size * 0.35, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.arc(x + size * 0.35, y + size * 0.35, 1.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.65, y + size * 0.35, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  draw() {
    this.drawBackground();
    this.drawFood();
    this.drawSnake();
  }
}

