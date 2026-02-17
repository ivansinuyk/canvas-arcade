export class DoodleJumpGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;

    this.player = {
      x: canvas.width / 2,
      y: canvas.height - 80,
      vx: 0,
      vy: 0,
      width: 40,
      height: 40,
    };

    this.gravity = 900;
    this.jumpVelocity = -550;
    this.moveSpeed = 260;

    this.platforms = [];
    this.maxPlatforms = 12;
    this.scrollOffset = 0;
    this.score = 0;
    this.bestScore = 0;

    this.gameOver = false;
    this.autoRestart = true;
  }

  createPlatform(y) {
    const r = Math.random();
    let type = "normal";
    if (r < 0.2) {
      type = "break"; // breaks on contact, no jump
    } else if (r < 0.4) {
      type = "boost"; // extra-strong jump
    }

    return {
      x: Math.random() * (this.canvas.width - 80) + 20,
      y,
      width: 90,
      height: 16,
      type,
      broken: false,
    };
  }

  reset() {
    this.platforms = [];
    this.scrollOffset = 0;
    this.score = 0;
    this.gameOver = false;

    const baseY = this.canvas.height - 40;
    for (let i = 0; i < this.maxPlatforms; i++) {
      const y = baseY - i * 70;
      this.platforms.push(this.createPlatform(y));
    }

    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height - 120;
    this.player.vx = 0;
    this.player.vy = this.jumpVelocity;

    this.setStatus(
      "Doodle: ← → to move. Green = normal, red = break, blue = super jump."
    );
  }

  onKeyDown(e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      this.player.vx = -this.moveSpeed;
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
      this.player.vx = this.moveSpeed;
    }
  }

  onKeyUp(e) {
    if (
      e.code === "ArrowLeft" ||
      e.code === "ArrowRight" ||
      e.code === "KeyA" ||
      e.code === "KeyD"
    ) {
      this.player.vx = 0;
    }
  }

  update(dt) {
    if (this.gameOver) return;

    const p = this.player;
    p.vy += this.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (p.x < -p.width) p.x = this.canvas.width;
    if (p.x > this.canvas.width) p.x = -p.width;

    if (p.vy > 0) {
      for (const plat of this.platforms) {
        const withinX =
          p.x + p.width * 0.5 > plat.x &&
          p.x + p.width * 0.5 < plat.x + plat.width;
        const withinY =
          p.y + p.height >= plat.y &&
          p.y + p.height <= plat.y + plat.height &&
          p.y + p.height - p.vy * dt <= plat.y;
        if (withinX && withinY) {
          // Breakable platform: disappears on contact, no jump
          if (plat.type === "break") {
            plat.broken = true;
            continue;
          }

          p.y = plat.y - p.height;
          if (plat.type === "boost") {
            p.vy = this.jumpVelocity * 1.6;
            this.score += 20;
          } else {
            p.vy = this.jumpVelocity;
            this.score += 10;
          }
        }
      }
    }

    const cameraThreshold = this.canvas.height * 0.4;
    if (p.y < cameraThreshold) {
      const diff = cameraThreshold - p.y;
      p.y = cameraThreshold;
      this.scrollOffset += diff;
      for (const plat of this.platforms) {
        plat.y += diff;
      }
    }

    this.platforms = this.platforms.filter(
      (plat) => !plat.broken && plat.y < this.canvas.height + 40
    );

    while (this.platforms.length < this.maxPlatforms) {
      const topMost = this.platforms.reduce(
        (min, p2) => Math.min(min, p2.y),
        this.canvas.height
      );
      const y = topMost - 70;
      this.platforms.push(this.createPlatform(y));
    }

    if (p.y > this.canvas.height + 100) {
      this.gameOver = true;
      this.bestScore = Math.max(this.bestScore, this.score);
      this.setStatus(`Doodle: Game over! Score ${this.score}, Best ${this.bestScore}`);
    } else {
      this.setStatus(`Doodle: Score ${this.score}, Best ${this.bestScore}`);
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#020617");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(w - 60, 60, 26, 0, Math.PI * 2);
    ctx.fill();

    for (const plat of this.platforms) {
      const type = plat.type || "normal";

      if (type === "break") {
        // Fragile, reddish platform
        const g = ctx.createLinearGradient(
          plat.x,
          plat.y,
          plat.x,
          plat.y + plat.height
        );
        g.addColorStop(0, "#f97316");
        g.addColorStop(1, "#b91c1c");
        ctx.fillStyle = g;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        // Cracks
        ctx.strokeStyle = "rgba(15,23,42,0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plat.x + 6, plat.y + 2);
        ctx.lineTo(plat.x + plat.width * 0.4, plat.y + plat.height - 2);
        ctx.moveTo(plat.x + plat.width * 0.6, plat.y + 2);
        ctx.lineTo(plat.x + plat.width - 6, plat.y + plat.height - 2);
        ctx.stroke();
      } else if (type === "boost") {
        // Super jump, glowing blue/purple
        const g = ctx.createLinearGradient(
          plat.x,
          plat.y,
          plat.x,
          plat.y + plat.height
        );
        g.addColorStop(0, "#38bdf8");
        g.addColorStop(1, "#6366f1");
        ctx.fillStyle = g;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        // Glow border
        ctx.strokeStyle = "rgba(56,189,248,0.9)";
        ctx.lineWidth = 3;
        ctx.strokeRect(
          plat.x - 1.5,
          plat.y - 1.5,
          plat.width + 3,
          plat.height + 3
        );
      } else {
        // Normal green platform
        const g = ctx.createLinearGradient(
          plat.x,
          plat.y,
          plat.x,
          plat.y + plat.height
        );
        g.addColorStop(0, "#22c55e");
        g.addColorStop(1, "#15803d");
        ctx.fillStyle = g;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
      }
    }

    const p = this.player;
    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.roundRect(-p.width / 2, -p.height / 2, p.width, p.height, 10);
    ctx.fill();

    ctx.fillStyle = "#e5e7eb";
    ctx.beginPath();
    ctx.arc(-6, -4, 4, 0, Math.PI * 2);
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.arc(-6, -4, 2, 0, Math.PI * 2);
    ctx.arc(6, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(15,23,42,0.8)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 6);
    ctx.quadraticCurveTo(0, 12, 8, 6);
    ctx.stroke();
    ctx.restore();
  }
}

