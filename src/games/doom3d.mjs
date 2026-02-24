// Doom-style 3D game: full mouse look, multiple floors, enemies, weapons, pickups, HUD.

export class Doom3DGame {
  constructor(canvas, _ctx2d, setStatus) {
    this.canvas = canvas;
    this.setStatus = setStatus;

    this.gl = null;
    this.program = null;
    this.buffers = null;

    // Camera
    this.camX = 0;
    this.camY = 1.0;
    this.camZ = 4;
    this.yaw = 0;
    this.pitch = 0; // vertical look (radians)
    this.moveSpeed = 4.5;
    this.mouseSensitivity = 0.0022;
    this.maxPitch = (85 * Math.PI) / 180;

    // Player
    this.playerHp = 100;
    this.maxHp = 100;
    this.weapons = [
      { name: "Pistol", damage: 28, cooldown: 0.35 },
      { name: "Shotgun", damage: 65, cooldown: 0.9 },
      { name: "Chaingun", damage: 18, cooldown: 0.12 },
    ];
    this.ownedWeapons = [0]; // indices: start with pistol
    this.currentWeaponIndex = 0;
    this.shootCooldown = 0;

    // World
    this.enemies = [];
    this.pickups = []; // { type: 'health'|'weapon', value, x,y,z, collected }
    this.enemyTypes = [
      { name: "Imp", hp: 60, speed: 1.2, color: [0.9, 0.25, 0.2], damage: 8 },
      { name: "Zombie", hp: 90, speed: 0.9, color: [0.2, 0.6, 0.3], damage: 12 },
      { name: "Demon", hp: 130, speed: 1.6, color: [0.5, 0.2, 0.6], damage: 15 },
    ];

    this.gameOver = false;
    this.autoRestart = false;
    this.setStatus("Doom3D: Click to lock mouse. WASD move, 1-3 weapons, mouse look & shoot.");
  }

  reset() {
    this.camX = 0;
    this.camY = 1.0;
    this.camZ = 4;
    this.yaw = 0;
    this.pitch = 0;
    this.playerHp = this.maxHp;
    this.ownedWeapons = [0];
    this.currentWeaponIndex = 0;
    this.shootCooldown = 0;
    this.gameOver = false;
    this.spawnEnemies();
    this.spawnPickups();
    this.setStatus("Doom3D: WASD move, 1-3 weapons, mouse look & shoot. Find health & weapons.");
  }

  spawnEnemies() {
    this.enemies = [];
    const positions = [
      [3, 0, 2], [-3, 0, -2], [0, 0, -4], [-4, 0, 3], [4, 0, -3],
      [2, 1.5, 2], [-2, 1.5, -1], // upper floor
    ];
    positions.forEach(([x, y, z], i) => {
      const type = i % this.enemyTypes.length;
      const et = this.enemyTypes[type];
      this.enemies.push({
        x, y, z,
        hp: et.hp,
        maxHp: et.hp,
        type,
        color: et.color.slice(),
        damage: et.damage,
        speed: et.speed,
      });
    });
  }

  spawnPickups() {
    this.pickups = [
      { type: "health", value: 25, x: 2.5, y: 0, z: -3, collected: false },
      { type: "health", value: 25, x: -3, y: 0, z: 2, collected: false },
      { type: "health", value: 50, x: 0, y: 1.5, z: 2.5, collected: false },
      { type: "weapon", value: 1, x: -4, y: 0, z: -3, collected: false },
      { type: "weapon", value: 2, x: 4, y: 1.5, z: 1, collected: false },
    ];
  }

  getFloorHeight(x, z) {
    const half = 6;
    if (x < -half || x > half || z < -half || z > half) return 0;
    if (x >= -1 && x <= 1 && z >= -2 && z <= 0) return 0.2 + (z + 2) / 2 * 1.3;
    if (x >= -5 && x <= -2 && z >= 2 && z <= 5) return 1.5;
    if (x >= 2 && x <= 5 && z >= -1 && z <= 2) return 1.5;
    return 0;
  }

  isWallOrPillar(x, z, margin = 0.25) {
    const half = 6;
    if (x < -half + margin || x > half - margin || z < -half + margin || z > half - margin) return true;
    const pillars = [[-2.5, -1.5], [2, 1.8], [0, 0], [-4, 3.5], [4, -2.5]];
    for (const [cx, cz] of pillars) {
      if (Math.abs(x - cx) < 0.6 + margin && Math.abs(z - cz) < 0.6 + margin) return true;
    }
    return false;
  }

  onKeyDown(e) {
    if (e.code === "Escape") {
      if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
      return;
    }
    if (e.code === "Digit1" && this.ownedWeapons.includes(0)) this.currentWeaponIndex = 0;
    if (e.code === "Digit2" && this.ownedWeapons.includes(1)) this.currentWeaponIndex = 1;
    if (e.code === "Digit3" && this.ownedWeapons.includes(2)) this.currentWeaponIndex = 2;
  }

  onKeyUp() {}

  onMouseMove(e) {
    if (document.pointerLockElement !== this.canvas) return;
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;
    this.yaw += dx * this.mouseSensitivity;
    this.pitch -= dy * this.mouseSensitivity;
    if (this.pitch > this.maxPitch) this.pitch = this.maxPitch;
    if (this.pitch < -this.maxPitch) this.pitch = -this.maxPitch;
  }

  onMouseDown(e) {
    if (e.button !== 0) return;
    if (this.gameOver) {
      this.reset();
      return;
    }
    if (document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock?.();
    this.tryShoot();
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.gameOver) return;
    const w = this.weapons[this.currentWeaponIndex];
    if (!w) return;
    this.shootCooldown = w.cooldown;

    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const sinP = Math.sin(this.pitch);
    const cosP = Math.cos(this.pitch);
    const dirX = sinY * cosP;
    const dirY = -sinP;
    const dirZ = -cosY * cosP;

    let bestT = Infinity;
    let hitEnemy = null;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - this.camX;
      const dy = (e.y + 0.5) - this.camY;
      const dz = e.z - this.camZ;
      const t = (dx * dirX + dy * dirY + dz * dirZ) / (dirX * dirX + dirY * dirY + dirZ * dirZ);
      if (t < 0.1) continue;
      const px = this.camX + dirX * t;
      const py = this.camY + dirY * t;
      const pz = this.camZ + dirZ * t;
      const dist = Math.abs(px - e.x) + Math.abs(py - (e.y + 0.5)) + Math.abs(pz - e.z);
      if (dist < 1.2 && t < bestT) {
        bestT = t;
        hitEnemy = e;
      }
    }
    if (hitEnemy) {
      hitEnemy.hp -= w.damage;
      if (hitEnemy.hp <= 0) hitEnemy.hp = 0;
    }
  }

  update(dt, keyState) {
    if (this.gameOver) return;

    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const forward = keyState.has("KeyW") || keyState.has("ArrowUp");
    const backward = keyState.has("KeyS") || keyState.has("ArrowDown");
    const left = keyState.has("KeyA");
    const right = keyState.has("KeyD");

    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);
    let vx = 0, vz = 0;
    if (forward) { vx += sinYaw; vz += -cosYaw; }
    if (backward) { vx -= sinYaw; vz -= -cosYaw; }
    if (left) { vx += -cosYaw; vz += -sinYaw; }
    if (right) { vx -= -cosYaw; vz -= -sinYaw; }

    const len = Math.hypot(vx, vz);
    if (len > 1e-5) {
      vx /= len; vz /= len;
      const step = this.moveSpeed * dt;
      let nx = this.camX + vx * step;
      let nz = this.camZ + vz * step;
      if (!this.isWallOrPillar(nx, this.camZ)) this.camX = nx;
      if (!this.isWallOrPillar(this.camX, nz)) this.camZ = nz;
    }

    this.camY = this.getFloorHeight(this.camX, this.camZ) + 1.0;

    for (const p of this.pickups) {
      if (p.collected) continue;
      const dx = p.x - this.camX, dz = p.z - this.camZ;
      if (dx * dx + dz * dz < 0.8) {
        p.collected = true;
        if (p.type === "health") this.playerHp = Math.min(this.maxHp, this.playerHp + p.value);
        if (p.type === "weapon" && !this.ownedWeapons.includes(p.value)) this.ownedWeapons.push(p.value);
      }
    }

    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dx = this.camX - e.x, dz = this.camZ - e.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.5) {
        this.playerHp -= e.damage * dt * 2;
        if (this.playerHp <= 0) {
          this.playerHp = 0;
          this.gameOver = true;
          this.setStatus("Doom3D: You died. Click to restart.");
        }
        continue;
      }
      if (dist < 0.01) continue;
      const step = e.speed * dt;
      let nx = e.x + (dx / dist) * step;
      let nz = e.z + (dz / dist) * step;
      if (!this.isWallOrPillar(nx, e.z)) e.x = nx;
      if (!this.isWallOrPillar(e.x, nz)) e.z = nz;
      e.y = this.getFloorHeight(e.x, e.z);
    }

    const alive = this.enemies.filter((e) => e.hp > 0).length;
    if (!this.gameOver) {
      const w = this.weapons[this.currentWeaponIndex];
      this.setStatus(
        `HP ${Math.round(this.playerHp)} | ${w ? w.name : ""} | Enemies ${alive} | 1-3 switch weapon`
      );
    }
  }

  ensureGl() {
    if (this.gl) return;
    let gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl") || this.canvas.getContext("webgl2");
    if (!gl) {
      this.setStatus("Doom3D: WebGL not supported.");
      this.gameOver = true;
      return;
    }
    this.gl = gl;

    const vs = `attribute vec3 aPosition; attribute vec3 aColor; uniform mat4 uProjection; uniform mat4 uView; varying vec3 vColor;
      void main() { gl_Position = uProjection * uView * vec4(aPosition, 1.0); vColor = aColor; }`;
    const fs = `precision mediump float; varying vec3 vColor; void main() { gl_FragColor = vec4(vColor, 1.0); }`;
    const vsh = this.createShader(gl, gl.VERTEX_SHADER, vs);
    const fsh = this.createShader(gl, gl.FRAGMENT_SHADER, fs);
    this.program = this.createProgram(gl, vsh, fsh);
    this.buffers = this.createSceneBuffers(gl);
    gl.enable(gl.DEPTH_TEST);
  }

  createShader(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
    return s;
  }

  createProgram(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    return p;
  }

  addQuad(vertices, p1, p2, p3, p4, color) {
    const [r, g, b] = color;
    const push = (p) => vertices.push(p[0], p[1], p[2], r, g, b);
    push(p1); push(p2); push(p3);
    push(p1); push(p3); push(p4);
  }

  createSceneBuffers(gl) {
    const vertices = [];
    const half = 6, floorY = 0, ceilY = 3;
    const wall1 = [0.23, 0.34, 0.46], wall2 = [0.18, 0.25, 0.36];
    const picColor = [0.6, 0.45, 0.25];

    this.addQuad(vertices,
      [-half, floorY, -half], [half, floorY, -half], [half, floorY, half], [-half, floorY, half],
      [0.12, 0.19, 0.25]);
    this.addQuad(vertices,
      [-half, ceilY, -half], [-half, ceilY, half], [half, ceilY, half], [half, ceilY, -half],
      [0.05, 0.07, 0.12]);

    this.addQuad(vertices, [-half, floorY, -half], [-half, ceilY, -half], [half, ceilY, -half], [half, floorY, -half], wall1);
    this.addQuad(vertices, [-half, floorY, half], [half, floorY, half], [half, ceilY, half], [-half, ceilY, half], wall1);
    this.addQuad(vertices, [-half, floorY, -half], [-half, floorY, half], [-half, ceilY, half], [-half, ceilY, -half], wall2);
    this.addQuad(vertices, [half, floorY, -half], [half, ceilY, -half], [half, ceilY, half], [half, floorY, half], wall2);

    this.addQuad(vertices, [-half, 1.2, -half + 0.01], [0, 1.2, -half + 0.01], [0, 2.4, -half + 0.01], [-half, 2.4, -half + 0.01], picColor);
    this.addQuad(vertices, [0, 1.2, -half + 0.01], [half, 1.2, -half + 0.01], [half, 2.4, -half + 0.01], [0, 2.4, -half + 0.01], [0.3, 0.5, 0.6]);

    const pillar = (cx, cz, size, height, color) => {
      const s = size / 2, y0 = floorY, y1 = y0 + height;
      this.addQuad(vertices, [cx - s, y0, cz + s], [cx + s, y0, cz + s], [cx + s, y1, cz + s], [cx - s, y1, cz + s], color);
      this.addQuad(vertices, [cx - s, y0, cz - s], [cx - s, y1, cz - s], [cx + s, y1, cz - s], [cx + s, y0, cz - s], color);
      this.addQuad(vertices, [cx - s, y0, cz - s], [cx - s, y0, cz + s], [cx - s, y1, cz + s], [cx - s, y1, cz - s], color);
      this.addQuad(vertices, [cx + s, y0, cz - s], [cx + s, y1, cz - s], [cx + s, y1, cz + s], [cx + s, y0, cz + s], color);
    };
    pillar(-2.5, -1.5, 1.2, 2.8, [0.45, 0.26, 0.55]);
    pillar(2, 1.8, 1, 2.4, [0.45, 0.26, 0.55]);
    pillar(0, 0, 1.4, 2.2, [0.4, 0.3, 0.5]);

    const rampY0 = 0.2, rampY1 = 1.5;
    for (let z = -2; z <= 0; z += 0.5) {
      const t = (z + 2) / 2;
      const y = rampY0 + t * (rampY1 - rampY0);
      this.addQuad(vertices, [-1, y, z], [1, y, z], [1, y, z + 0.5], [-1, y, z + 0.5], [0.15, 0.22, 0.3]);
    }
    this.addQuad(vertices, [-5, 1.5, 2], [5, 1.5, 2], [5, 1.5, 5], [-5, 1.5, 5], [0.14, 0.2, 0.28]);
    this.addQuad(vertices, [2, 1.5, -1], [5, 1.5, -1], [5, 1.5, 2], [2, 1.5, 2], [0.14, 0.2, 0.28]);
    pillar(-4, 3.5, 1, 1.5, [0.4, 0.3, 0.5]);
    pillar(4, -2.5, 1, 1.5, [0.4, 0.3, 0.5]);

    const data = new Float32Array(vertices);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    return { vbo, vertexCount: data.length / 6 };
  }

  drawBox(gl, program, view, proj, cx, cy, cz, size, color) {
    const s = size / 2;
    const verts = [];
    this.addQuad(verts, [cx - s, cy - s, cz + s], [cx + s, cy - s, cz + s], [cx + s, cy + s, cz + s], [cx - s, cy + s, cz + s], color);
    this.addQuad(verts, [cx - s, cy - s, cz - s], [cx - s, cy + s, cz - s], [cx + s, cy + s, cz - s], [cx + s, cy - s, cz - s], color);
    this.addQuad(verts, [cx - s, cy - s, cz - s], [cx - s, cy - s, cz + s], [cx - s, cy + s, cz + s], [cx - s, cy + s, cz - s], color);
    this.addQuad(verts, [cx + s, cy - s, cz - s], [cx + s, cy + s, cz - s], [cx + s, cy + s, cz + s], [cx + s, cy - s, cz + s], color);
    this.addQuad(verts, [cx - s, cy + s, cz - s], [cx - s, cy + s, cz + s], [cx + s, cy + s, cz + s], [cx + s, cy + s, cz - s], color);
    this.addQuad(verts, [cx - s, cy - s, cz - s], [cx + s, cy - s, cz - s], [cx + s, cy - s, cz + s], [cx - s, cy - s, cz + s], color);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
    const stride = 24;
    gl.vertexAttribPointer(gl.getAttribLocation(program, "aPosition"), 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(gl.getAttribLocation(program, "aColor"), 3, gl.FLOAT, false, stride, 12);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjection"), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uView"), false, view);
    gl.drawArrays(gl.TRIANGLES, 0, verts.length / 6);
    gl.deleteBuffer(vbo);
  }

  buildViewMatrix() {
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const sp = Math.sin(this.pitch), cp = Math.cos(this.pitch);
    const fx = sy * cp, fy = -sp, fz = -cy * cp;
    const rx = -cy * cp, ry = 0, rz = -sy * cp;
    const ux = sy * sp, uy = cp, uz = -cy * sp;
    const px = this.camX, py = this.camY, pz = this.camZ;
    const v = new Float32Array(16);
    v[0] = rx; v[1] = ux; v[2] = -fx; v[3] = 0;
    v[4] = ry; v[5] = uy; v[6] = -fy; v[7] = 0;
    v[8] = rz; v[9] = uz; v[10] = -fz; v[11] = 0;
    v[12] = -(rx * px + ry * py + rz * pz);
    v[13] = -(ux * px + uy * py + uz * pz);
    v[14] = fx * px + fy * py + fz * pz;
    v[15] = 1;
    return v;
  }

  buildProjMatrix() {
    const fov = (60 * Math.PI) / 180, aspect = this.canvas.width / this.canvas.height, near = 0.1, far = 100;
    const f = 1 / Math.tan(fov / 2);
    const p = new Float32Array(16);
    p[0] = f / aspect; p[5] = f; p[10] = (far + near) / (near - far); p[11] = -1;
    p[14] = (2 * far * near) / (near - far);
    return p;
  }

  draw() {
    this.ensureGl();
    if (!this.gl || !this.program || !this.buffers) return;

    const gl = this.gl, program = this.program;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.02, 0.02, 0.04, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const proj = this.buildProjMatrix();
    const view = this.buildViewMatrix();

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.vbo);
    const stride = 24;
    gl.enableVertexAttribArray(gl.getAttribLocation(program, "aPosition"));
    gl.vertexAttribPointer(gl.getAttribLocation(program, "aPosition"), 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(gl.getAttribLocation(program, "aColor"));
    gl.vertexAttribPointer(gl.getAttribLocation(program, "aColor"), 3, gl.FLOAT, false, stride, 12);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjection"), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uView"), false, view);
    gl.drawArrays(gl.TRIANGLES, 0, this.buffers.vertexCount);

    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      this.drawBox(gl, program, view, proj, e.x, e.y + 0.5, e.z, 0.5, e.color);
      if (e.hp < e.maxHp) {
        const t = e.hp / e.maxHp;
        const barY = e.y + 1.1;
        const verts = [];
        this.addQuad(verts, [e.x - 0.3, barY, e.z + 0.26], [e.x + 0.3, barY, e.z + 0.26], [e.x + 0.3, barY + 0.06, e.z + 0.26], [e.x - 0.3, barY + 0.06, e.z + 0.26], [0.2, 0.2, 0.2]);
        this.addQuad(verts, [e.x - 0.28, barY + 0.02, e.z + 0.27], [e.x - 0.28 + 0.56 * t, barY + 0.02, e.z + 0.27], [e.x - 0.28 + 0.56 * t, barY + 0.04, e.z + 0.27], [e.x - 0.28, barY + 0.04, e.z + 0.27], [0.2, 0.9, 0.2]);
        const vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
        gl.vertexAttribPointer(gl.getAttribLocation(program, "aPosition"), 3, gl.FLOAT, false, 24, 0);
        gl.vertexAttribPointer(gl.getAttribLocation(program, "aColor"), 3, gl.FLOAT, false, 24, 12);
        gl.drawArrays(gl.TRIANGLES, 0, verts.length / 6);
        gl.deleteBuffer(vbo);
      }
    }

    for (const p of this.pickups) {
      if (p.collected) continue;
      if (p.type === "health") this.drawBox(gl, program, view, proj, p.x, p.y + 0.2, p.z, 0.35, [0.2, 0.85, 0.3]);
      if (p.type === "weapon") this.drawBox(gl, program, view, proj, p.x, p.y + 0.25, p.z, 0.3, [0.85, 0.7, 0.2]);
    }

    gl.disable(gl.DEPTH_TEST);
    const ortho = new Float32Array(16);
    ortho[0] = 2 / this.canvas.width; ortho[5] = -2 / this.canvas.height; ortho[10] = -1; ortho[12] = -1; ortho[13] = 1; ortho[15] = 1;
    const identity = new Float32Array(16);
    identity[0] = identity[5] = identity[10] = identity[15] = 1;
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uProjection"), false, ortho);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, "uView"), false, identity);

    const barW = 200, barH = 18, margin = 20;
    const hudVerts = [];
    this.addQuad(hudVerts, [margin, this.canvas.height - margin - barH, 0], [margin + barW, this.canvas.height - margin - barH, 0], [margin + barW, this.canvas.height - margin, 0], [margin, this.canvas.height - margin, 0], [0.15, 0.15, 0.15]);
    const fillW = (this.playerHp / this.maxHp) * (barW - 4);
    this.addQuad(hudVerts, [margin + 2, this.canvas.height - margin - barH + 2, 0], [margin + 2 + fillW, this.canvas.height - margin - barH + 2, 0], [margin + 2 + fillW, this.canvas.height - margin - 2, 0], [margin + 2, this.canvas.height - margin - 2, 0], [0.85, 0.2, 0.2]);
    const hudVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, hudVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(hudVerts), gl.STATIC_DRAW);
    gl.vertexAttribPointer(gl.getAttribLocation(program, "aPosition"), 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(gl.getAttribLocation(program, "aColor"), 3, gl.FLOAT, false, 24, 12);
    gl.drawArrays(gl.TRIANGLES, 0, hudVerts.length / 6);
    gl.deleteBuffer(hudVbo);

    const crossSize = 4;
    const cV = [];
    this.addQuad(cV, [this.canvas.width / 2 - crossSize, this.canvas.height / 2 - 1, 0], [this.canvas.width / 2 + crossSize, this.canvas.height / 2 - 1, 0], [this.canvas.width / 2 + crossSize, this.canvas.height / 2 + 1, 0], [this.canvas.width / 2 - crossSize, this.canvas.height / 2 + 1, 0], [1, 1, 1]);
    this.addQuad(cV, [this.canvas.width / 2 - 1, this.canvas.height / 2 - crossSize, 0], [this.canvas.width / 2 + 1, this.canvas.height / 2 - crossSize, 0], [this.canvas.width / 2 + 1, this.canvas.height / 2 + crossSize, 0], [this.canvas.width / 2 - 1, this.canvas.height / 2 + crossSize, 0], [1, 1, 1]);
    const cVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cV), gl.STATIC_DRAW);
    gl.vertexAttribPointer(gl.getAttribLocation(program, "aPosition"), 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(gl.getAttribLocation(program, "aColor"), 3, gl.FLOAT, false, 24, 12);
    gl.drawArrays(gl.TRIANGLES, 0, cV.length / 6);
    gl.deleteBuffer(cVbo);

    gl.enable(gl.DEPTH_TEST);
  }
}
