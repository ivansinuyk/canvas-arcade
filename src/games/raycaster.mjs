export class RaycasterGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;

    // Simple 2D grid map (1 = wall, 0 = empty)
    // Inspired by classic Wolfenstein/Doom-like layouts
    this.map = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 0, 0, 0, 0, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 2, 0, 0, 0, 0, 3, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 3, 0, 0, 0, 0, 2, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];

    this.mapWidth = this.map[0].length;
    this.mapHeight = this.map.length;

    // Player in map coordinates
    this.posX = 3.5;
    this.posY = 3.5;

    // Initially looking down the +X axis
    this.dirX = 1;
    this.dirY = 0;

    // Camera plane (perpendicular to dir), controls FOV
    this.planeX = 0;
    this.planeY = 0.66; // ~66° FOV

    this.moveSpeed = 3.0; // units per second
    this.rotSpeed = 2.2; // radians per second

    this.mouseSensitivity = 0.0028;

    this.playerHp = 100;
    this.maxHp = 100;
    this.enemies = [];

    // Weapon / shooting animation
    this.shootTimer = 0;
    this.muzzleTimer = 0;

    this.gameOver = false;
    this.autoRestart = false;

    this.setStatus(
      "Raycaster: W/S move, A/D turn, mouse to look, click to shoot."
    );
  }

  reset() {
    this.posX = 3.5;
    this.posY = 3.5;
    this.dirX = 1;
    this.dirY = 0;
    this.planeX = 0;
    this.planeY = 0.66;
    this.gameOver = false;
    this.playerHp = this.maxHp;
    this.shootTimer = 0;
    this.muzzleTimer = 0;

    // Spawn a few random enemies
    this.enemies = [];
    this.spawnEnemies(5);

    this.setStatus(
      "Raycaster: W/S move, A/D turn, mouse to look, click to shoot."
    );
  }

  spawnEnemies(count) {
    for (let i = 0; i < count; i++) {
      let tries = 0;
      while (tries < 100) {
        const x = 1 + Math.random() * (this.mapWidth - 2);
        const y = 1 + Math.random() * (this.mapHeight - 2);
        const dx = x - this.posX;
        const dy = y - this.posY;
        const dist = Math.hypot(dx, dy);
        if (!this.isWall(x, y) && dist > 3) {
          this.enemies.push({
            x,
            y,
            hp: 60,
            maxHp: 60,
          });
          break;
        }
        tries++;
      }
    }
  }

  isWall(x, y) {
    const mx = Math.floor(x);
    const my = Math.floor(y);
    if (mx < 0 || mx >= this.mapWidth || my < 0 || my >= this.mapHeight) {
      return true;
    }
    return this.map[my][mx] !== 0;
  }

  onKeyDown(e) {
    // Prevent page scroll with arrows / space
    if (
      e.code === "ArrowUp" ||
      e.code === "ArrowDown" ||
      e.code === "Space"
    ) {
      e.preventDefault();
    }
  }

  onKeyUp() {}

  onMouseMove(e) {
    if (this.gameOver) return;
    // Only rotate when pointer is locked to the canvas for FPS-style control
    if (document.pointerLockElement !== this.canvas) return;
    const dx = e.movementX || 0;
    if (!dx) return;
    const rot = dx * this.mouseSensitivity;

    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const oldDirX = this.dirX;
    this.dirX = this.dirX * cos - this.dirY * sin;
    this.dirY = oldDirX * sin + this.dirY * cos;
    const oldPlaneX = this.planeX;
    this.planeX = this.planeX * cos - this.planeY * sin;
    this.planeY = oldPlaneX * sin + this.planeY * cos;
  }

  onMouseDown(e) {
    if (this.gameOver) {
      if (e.button === 0) {
        this.reset();
      }
      return;
    }

    if (e.button === 0) {
      // Lock pointer for smooth mouse look if possible
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
      this.shoot();
    }
  }

  shoot() {
    // Trigger weapon animation
    this.shootTimer = 0.12;
    this.muzzleTimer = 0.06;

    if (!this.enemies.length) return;

    let bestEnemy = null;
    let bestDist = Infinity;

    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const dx = enemy.x - this.posX;
      const dy = enemy.y - this.posY;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.5) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      const dot = nx * this.dirX + ny * this.dirY;
      if (dot <= Math.cos((10 * Math.PI) / 180)) continue; // 10° cone

      // Check if a wall blocks the shot
      const step = 0.1;
      let blocked = false;
      for (let t = step; t < dist; t += step) {
        const tx = this.posX + nx * t;
        const ty = this.posY + ny * t;
        if (this.isWall(tx, ty)) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      if (dist < bestDist) {
        bestDist = dist;
        bestEnemy = enemy;
      }
    }

    if (bestEnemy) {
      bestEnemy.hp -= 35;
      if (bestEnemy.hp <= 0) {
        bestEnemy.hp = 0;
      }
    }
  }

  update(dt, keyState) {
    if (this.gameOver) return;

    // Update weapon animation timers
    if (this.shootTimer > 0) {
      this.shootTimer = Math.max(0, this.shootTimer - dt);
    }
    if (this.muzzleTimer > 0) {
      this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    }

    const move = this.moveSpeed * dt;
    const rot = this.rotSpeed * dt;

    const forward =
      keyState.has("KeyW") || keyState.has("ArrowUp");
    const backward =
      keyState.has("KeyS") || keyState.has("ArrowDown");
    const turnLeft =
      keyState.has("KeyA") || keyState.has("ArrowLeft");
    const turnRight =
      keyState.has("KeyD") || keyState.has("ArrowRight");

    // Move forward/backward with simple collision
    if (forward) {
      const nx = this.posX + this.dirX * move;
      const ny = this.posY + this.dirY * move;
      if (!this.isWall(nx, this.posY)) this.posX = nx;
      if (!this.isWall(this.posX, ny)) this.posY = ny;
    } else if (backward) {
      const nx = this.posX - this.dirX * move;
      const ny = this.posY - this.dirY * move;
      if (!this.isWall(nx, this.posY)) this.posX = nx;
      if (!this.isWall(this.posX, ny)) this.posY = ny;
    }

    // Rotate left/right with keys (mouse handled separately)
    if (turnLeft) {
      const cos = Math.cos(-rot);
      const sin = Math.sin(-rot);
      const oldDirX = this.dirX;
      this.dirX = this.dirX * cos - this.dirY * sin;
      this.dirY = oldDirX * sin + this.dirY * cos;
      const oldPlaneX = this.planeX;
      this.planeX = this.planeX * cos - this.planeY * sin;
      this.planeY = oldPlaneX * sin + this.planeY * cos;
    } else if (turnRight) {
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const oldDirX = this.dirX;
      this.dirX = this.dirX * cos - this.dirY * sin;
      this.dirY = oldDirX * sin + this.dirY * cos;
      const oldPlaneX = this.planeX;
      this.planeX = this.planeX * cos - this.planeY * sin;
      this.planeY = oldPlaneX * sin + this.planeY * cos;
    }

    // Simple enemy movement towards player
    const enemySpeed = 1.0;
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const dx = this.posX - enemy.x;
      const dy = this.posY - enemy.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.3) continue; // already overlapping
      const stepX = (dx / dist) * enemySpeed * dt;
      const stepY = (dy / dist) * enemySpeed * dt;
      const nx = enemy.x + stepX;
      const ny = enemy.y + stepY;
      if (!this.isWall(nx, enemy.y)) enemy.x = nx;
      if (!this.isWall(enemy.x, ny)) enemy.y = ny;

      // Damage player if close
      if (dist < 0.7) {
        this.playerHp -= 18 * dt;
        if (this.playerHp <= 0) {
          this.playerHp = 0;
          this.gameOver = true;
          this.setStatus(
            "Raycaster: You died. Click to restart."
          );
        }
      }
    }

    const alive = this.enemies.filter((e) => e.hp > 0).length;
    if (!this.gameOver) {
      this.setStatus(
        `Raycaster: HP ${Math.round(
          this.playerHp
        )} — Enemies ${alive} — W/S move, A/D turn, mouse look, click shoot.`
      );
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h / 2);
    skyGrad.addColorStop(0, "#020617");
    skyGrad.addColorStop(1, "#1e293b");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h / 2);

    // Floor
    const floorGrad = ctx.createLinearGradient(0, h / 2, 0, h);
    floorGrad.addColorStop(0, "#111827");
    floorGrad.addColorStop(1, "#030712");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h / 2, w, h / 2);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.drawBackground();

    const zBuffer = new Array(w);

    // Raycast one vertical slice per screen column (walls)
    for (let x = 0; x < w; x++) {
      // Map screen X to camera space (-1 to 1)
      const cameraX = (2 * x) / w - 1;
      const rayDirX = this.dirX + this.planeX * cameraX;
      const rayDirY = this.dirY + this.planeY * cameraX;

      // Current map square
      let mapX = Math.floor(this.posX);
      let mapY = Math.floor(this.posY);

      // Length of ray from one x/y-side to next x/y-side
      const deltaDistX =
        rayDirX === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayDirX);
      const deltaDistY =
        rayDirY === 0 ? Number.POSITIVE_INFINITY : Math.abs(1 / rayDirY);

      let sideDistX;
      let sideDistY;

      // Direction to step in map grid
      let stepX;
      let stepY;

      if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (this.posX - mapX) * deltaDistX;
      } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - this.posX) * deltaDistX;
      }

      if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (this.posY - mapY) * deltaDistY;
      } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - this.posY) * deltaDistY;
      }

      let hit = false;
      let side = 0; // 0 = X side, 1 = Y side
      let wallType = 0;

      // DDA (ray marching through grid)
      for (let i = 0; i < 128; i++) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaDistX;
          mapX += stepX;
          side = 0;
        } else {
          sideDistY += deltaDistY;
          mapY += stepY;
          side = 1;
        }

        if (
          mapX < 0 ||
          mapX >= this.mapWidth ||
          mapY < 0 ||
          mapY >= this.mapHeight
        ) {
          break;
        }
        const cell = this.map[mapY][mapX];
        if (cell !== 0) {
          hit = true;
          wallType = cell;
          break;
        }
      }

      if (!hit) continue;

      // Calculate distance to wall perpendicular to camera plane
      let perpWallDist;
      if (side === 0) {
        perpWallDist =
          (mapX - this.posX + (1 - stepX) / 2) / (rayDirX || 1e-6);
      } else {
        perpWallDist =
          (mapY - this.posY + (1 - stepY) / 2) / (rayDirY || 1e-6);
      }
      if (perpWallDist <= 0) perpWallDist = 0.1;

      zBuffer[x] = perpWallDist;

      const lineHeight = Math.floor(h / perpWallDist);
      let drawStart = -lineHeight / 2 + h / 2;
      let drawEnd = lineHeight / 2 + h / 2;
      if (drawStart < 0) drawStart = 0;
      if (drawEnd >= h) drawEnd = h - 1;

      // Choose wall color based on type
      let baseColor;
      switch (wallType) {
        case 1:
          baseColor = { r: 56, g: 189, b: 248 }; // cyan
          break;
        case 2:
          baseColor = { r: 244, g: 114, b: 182 }; // pink
          break;
        case 3:
          baseColor = { r: 59, g: 130, b: 246 }; // blue
          break;
        default:
          baseColor = { r: 148, g: 163, b: 184 }; // gray
      }

      // Darken for Y sides for simple shading
      let shade = side === 1 ? 0.6 : 0.9;

      // Distance-based falloff
      const fog = Math.min(1, perpWallDist / 12);
      shade *= 1 - fog * 0.7;

      const r = Math.floor(baseColor.r * shade);
      const g = Math.floor(baseColor.g * shade);
      const b = Math.floor(baseColor.b * shade);
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;

      ctx.beginPath();
      ctx.moveTo(x + 0.5, drawStart);
      ctx.lineTo(x + 0.5, drawEnd);
      ctx.stroke();
    }

    this.drawEnemies3D(zBuffer);
    this.drawWeapon();
  }

  drawEnemies3D(zBuffer) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const sprites = this.enemies
      .filter((e) => e.hp > 0)
      .map((e) => {
        const dx = e.x - this.posX;
        const dy = e.y - this.posY;
        const dist = Math.hypot(dx, dy);
        return { ...e, dist };
      })
      .sort((a, b) => b.dist - a.dist); // far to near

    const invDet =
      1.0 / (this.planeX * this.dirY - this.dirX * this.planeY || 1e-6);

    for (const s of sprites) {
      const spriteX = s.x - this.posX;
      const spriteY = s.y - this.posY;

      const transformX =
        invDet * (this.dirY * spriteX - this.dirX * spriteY);
      const transformY =
        invDet * (-this.planeY * spriteX + this.planeX * spriteY);

      if (transformY <= 0) continue; // behind camera

      const spriteScreenX = Math.floor(
        (w / 2) * (1 + transformX / transformY)
      );

      // If center of sprite is behind a wall at that column, skip (simple occlusion)
      if (
        spriteScreenX < 0 ||
        spriteScreenX >= w ||
        transformY >= (zBuffer[spriteScreenX] || Infinity)
      ) {
        continue;
      }

      const spriteHeight = Math.abs(Math.floor(h / transformY));
      let drawStartY = -spriteHeight / 2 + h / 2;
      let drawEndY = spriteHeight / 2 + h / 2;
      if (drawStartY < 0) drawStartY = 0;
      if (drawEndY >= h) drawEndY = h - 1;

      const spriteWidth = spriteHeight * 0.5;
      const centerX = spriteScreenX;

      const bodyTop = drawStartY + spriteHeight * 0.25;
      const bodyBottom = drawEndY;
      const bodyWidth = spriteWidth * 0.5;

      const headRadius = spriteHeight * 0.13;
      const headCenterY = drawStartY + spriteHeight * 0.18;

      // Body
      ctx.fillStyle = "#1f2937";
      ctx.beginPath();
      ctx.roundRect(
        centerX - bodyWidth / 2,
        bodyTop,
        bodyWidth,
        bodyBottom - bodyTop,
        6
      );
      ctx.fill();

      // Head
      ctx.fillStyle = "#e5b98a";
      ctx.beginPath();
      ctx.arc(centerX, headCenterY, headRadius, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = "#0f172a";
      const eyeOffsetX = headRadius * 0.35;
      const eyeOffsetY = -headRadius * 0.1;
      ctx.beginPath();
      ctx.arc(
        centerX - eyeOffsetX,
        headCenterY + eyeOffsetY,
        headRadius * 0.18,
        0,
        Math.PI * 2
      );
      ctx.arc(
        centerX + eyeOffsetX,
        headCenterY + eyeOffsetY,
        headRadius * 0.18,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Arms
      ctx.strokeStyle = "#374151";
      ctx.lineWidth = 3;
      const armY = bodyTop + (bodyBottom - bodyTop) * 0.3;
      const armSpan = bodyWidth * 1.6;
      ctx.beginPath();
      ctx.moveTo(centerX - armSpan / 2, armY);
      ctx.lineTo(centerX + armSpan / 2, armY);
      ctx.stroke();

      // Legs
      ctx.strokeStyle = "#111827";
      ctx.lineWidth = 4;
      const legYTop = bodyBottom;
      const legYBottom = bodyBottom + spriteHeight * 0.18;
      const legOffsetX = bodyWidth * 0.2;
      ctx.beginPath();
      ctx.moveTo(centerX - legOffsetX, legYTop);
      ctx.lineTo(centerX - legOffsetX, legYBottom);
      ctx.moveTo(centerX + legOffsetX, legYTop);
      ctx.lineTo(centerX + legOffsetX, legYBottom);
      ctx.stroke();
    }
  }

  drawWeapon() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const gunWidth = w * 0.32;
    const gunHeight = h * 0.28;

    // Simple recoil: move gun slightly down when shooting
    const maxRecoil = 16;
    const recoil =
      this.shootTimer > 0 ? (this.shootTimer / 0.12) * maxRecoil : 0;

    const x = (w - gunWidth) / 2;
    const y = h - gunHeight - 10 + recoil;

    ctx.save();

    // Gun body
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + gunHeight);
    bodyGrad.addColorStop(0, "#0f172a");
    bodyGrad.addColorStop(1, "#111827");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, gunWidth, gunHeight, 18);
    ctx.fill();

    // Barrel
    const barrelWidth = gunWidth * 0.4;
    const barrelHeight = gunHeight * 0.35;
    const bx = x + gunWidth / 2 - barrelWidth / 2;
    const by = y + gunHeight * 0.1;
    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.roundRect(bx, by, barrelWidth, barrelHeight, 10);
    ctx.fill();

    // Highlight
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.beginPath();
    ctx.roundRect(
      bx + 4,
      by + 4,
      barrelWidth - 8,
      barrelHeight * 0.4,
      6
    );
    ctx.fill();

    // Grip
    const gripWidth = gunWidth * 0.22;
    const gripHeight = gunHeight * 0.42;
    const gx = x + gunWidth * 0.32;
    const gy = y + gunHeight * 0.45;
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.roundRect(gx, gy, gripWidth, gripHeight, 10);
    ctx.fill();

    // Accent stripes
    ctx.strokeStyle = "rgba(59, 130, 246, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + gunWidth * 0.15, y + gunHeight * 0.3);
    ctx.lineTo(x + gunWidth * 0.85, y + gunHeight * 0.3);
    ctx.moveTo(x + gunWidth * 0.2, y + gunHeight * 0.37);
    ctx.lineTo(x + gunWidth * 0.8, y + gunHeight * 0.37);
    ctx.stroke();

    // Muzzle flash when firing
    if (this.muzzleTimer > 0) {
      const alpha = this.muzzleTimer / 0.06;
      const mx = bx + barrelWidth / 2;
      const my = by - 8;
      const flashRadius = gunHeight * 0.2;

      const grad = ctx.createRadialGradient(
        mx,
        my,
        0,
        mx,
        my,
        flashRadius
      );
      grad.addColorStop(0, `rgba(252, 211, 77, ${alpha})`);
      grad.addColorStop(0.4, `rgba(248, 250, 252, ${alpha * 0.9})`);
      grad.addColorStop(1, "rgba(0,0,0,0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mx, my, flashRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

