export class Doom3DGame {
  constructor(canvas, _ctx2d, setStatus) {
    this.canvas = canvas;
    this.setStatus = setStatus;

    this.gl = null;
    this.program = null;
    this.loc = {};
    this.sceneVbo = null;
    this.sceneVertCount = 0;
    this.dynVbo = null;
    this.hudVbo = null;

    this.camX = 0;
    this.camY = 1.5;
    this.camZ = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.moveSpeed = 5;
    this.mouseSens = 0.002;
    this.maxPitch = (80 * Math.PI) / 180;
    this.headBob = 0;
    this.bobActive = false;

    this.hp = 100;
    this.maxHp = 100;
    this.armor = 0;
    this.maxArmor = 100;
    this.ammo = 50;
    this.maxAmmo = 200;

    this.weapons = [
      { name: "Fist", dmg: 25, cd: 0.4, ammoUse: 0, range: 2.5 },
      { name: "Pistol", dmg: 22, cd: 0.35, ammoUse: 1, range: 50 },
      { name: "Shotgun", dmg: 65, cd: 0.85, ammoUse: 2, range: 20 },
      { name: "Chaingun", dmg: 15, cd: 0.08, ammoUse: 1, range: 50 },
    ];
    this.owned = [0, 1];
    this.wpnIdx = 1;
    this.shootCD = 0;
    this.muzzleFlash = 0;
    this.damageFlash = 0;
    this.weaponKick = 0;
    this.mouseHeld = false;

    this.enemies = [];
    this.pickups = [];
    this.projectiles = [];
    this.time = 0;
    this.kills = 0;
    this.totalEnemies = 0;

    this.enemyTypes = [
      { name: "Imp", hp: 60, spd: 2.2, col: [0.85, 0.2, 0.15], dmg: 8, atkRange: 12, atkCD: 1.8, ranged: true, projSpd: 8, sz: 0.45 },
      { name: "Zombie", hp: 40, spd: 1.5, col: [0.3, 0.55, 0.2], dmg: 10, atkRange: 10, atkCD: 2.2, ranged: true, projSpd: 10, sz: 0.45 },
      { name: "Demon", hp: 150, spd: 3.5, col: [0.55, 0.15, 0.5], dmg: 25, atkRange: 2, atkCD: 0.7, ranged: false, projSpd: 0, sz: 0.55 },
      { name: "Baron", hp: 250, spd: 1.8, col: [0.5, 0.8, 0.2], dmg: 18, atkRange: 18, atkCD: 2.0, ranged: true, projSpd: 7, sz: 0.6 },
    ];

    this.mapData = null;
    this.mapW = 0;
    this.mapH = 0;
    this.cellSize = 3;
    this.wallH = 3;
    this.lights = [];

    this.hudOverlay = null;
    this.hudCtx = null;

    this._onMouseUp = (e) => {
      if (e.button === 0) this.mouseHeld = false;
    };
    window.addEventListener("mouseup", this._onMouseUp);

    this.gameOver = false;
    this.autoRestart = false;
    this.levelComplete = false;
  }

  cleanup() {
    window.removeEventListener("mouseup", this._onMouseUp);
    if (this.hudOverlay) {
      this.hudOverlay.remove();
      this.hudOverlay = null;
      this.hudCtx = null;
    }
  }

  reset() {
    this.hp = this.maxHp;
    this.armor = 0;
    this.ammo = 50;
    this.owned = [0, 1];
    this.wpnIdx = 1;
    this.shootCD = 0;
    this.muzzleFlash = 0;
    this.damageFlash = 0;
    this.weaponKick = 0;
    this.kills = 0;
    this.gameOver = false;
    this.levelComplete = false;
    this.time = 0;
    this.projectiles = [];
    this.yaw = 0;
    this.pitch = 0;
    this.headBob = 0;
    this.mouseHeld = false;
    this.sceneVbo = null;
    this.buildLevel();
    this.setStatus("Doom3D: Click to lock mouse. WASD move, mouse aim/shoot, 1-4 weapons.");
  }

  buildLevel() {
    this.mapData = [
      "################",
      "#..............#",
      "#..##....###...#",
      "#..##....#.....#",
      "#........#..####",
      "#...####.#.....#",
      "#...#..........#",
      "#...#..####..###",
      "#...#..#.......#",
      "###....#..####.#",
      "#......#.......#",
      "#..#####..###..#",
      "#.............##",
      "#..####..####..#",
      "#..............#",
      "################",
    ];
    this.mapW = this.mapData[0].length;
    this.mapH = this.mapData.length;
    const cs = this.cellSize;

    this.camX = 1.5 * cs;
    this.camZ = 1.5 * cs;
    this.camY = 1.5;

    this.lights = [];
    const lp = [
      [2, 1], [7, 1], [13, 1], [1, 5], [6, 3], [10, 4],
      [14, 5], [5, 7], [10, 7], [2, 10], [7, 10], [13, 10],
    ];
    for (const [c, r] of lp) {
      if (r < this.mapH && c < this.mapW && this.mapData[r][c] === ".") {
        this.lights.push({
          x: (c + 0.5) * cs, y: 2.4, z: (r + 0.5) * cs,
          r: 1.0, g: 0.65 + Math.random() * 0.15, b: 0.25,
          phase: Math.random() * Math.PI * 2,
          flicker: 0.1 + Math.random() * 0.2,
        });
      }
    }

    this.enemies = [];
    const es = [
      [5, 2, 0], [10, 3, 1], [7, 5, 0], [13, 5, 2],
      [3, 7, 1], [10, 7, 0], [5, 9, 2], [13, 9, 1],
      [8, 11, 3], [3, 12, 0], [11, 12, 2], [7, 14, 1],
      [13, 14, 3],
    ];
    for (const [c, r, type] of es) {
      if (r < this.mapH && c < this.mapW && this.mapData[r][c] === ".") {
        const et = this.enemyTypes[type];
        this.enemies.push({
          x: (c + 0.5) * cs, y: 0, z: (r + 0.5) * cs,
          hp: et.hp, maxHp: et.hp, type,
          speed: et.spd, dmg: et.dmg,
          atkRange: et.atkRange, atkCD: et.atkCD,
          atkTimer: Math.random() * et.atkCD,
          ranged: et.ranged, alive: true, flinch: 0,
        });
      }
    }
    this.totalEnemies = this.enemies.length;

    this.pickups = [];
    const ps = [
      [3, 3, "health", 25], [13, 2, "health", 25], [1, 8, "health", 50],
      [14, 14, "health", 50], [6, 1, "armor", 30], [10, 10, "armor", 50],
      [2, 6, "ammo", 20], [8, 8, "ammo", 30], [12, 3, "ammo", 20],
      [5, 13, "ammo", 25], [10, 1, "weapon", 2], [1, 14, "weapon", 3],
    ];
    for (const [c, r, type, value] of ps) {
      if (r < this.mapH && c < this.mapW && this.mapData[r][c] === ".") {
        this.pickups.push({
          x: (c + 0.5) * cs, y: 0.3, z: (r + 0.5) * cs,
          type, value, collected: false,
        });
      }
    }
  }

  isWall(c, r) {
    if (c < 0 || c >= this.mapW || r < 0 || r >= this.mapH) return true;
    return this.mapData[r][c] === "#";
  }

  canMove(x, z, rad = 0.3) {
    const cs = this.cellSize;
    const checks = [
      [x - rad, z - rad], [x + rad, z - rad],
      [x - rad, z + rad], [x + rad, z + rad],
    ];
    for (const [px, pz] of checks) {
      if (this.isWall(Math.floor(px / cs), Math.floor(pz / cs))) return false;
    }
    return true;
  }

  onKeyDown(e) {
    if (e.code === "Escape") {
      if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();
      return;
    }
    if (this.gameOver || this.levelComplete) {
      if (e.code === "Space" || e.code === "Enter") this.reset();
      return;
    }
    if (e.code === "Digit1" && this.owned.includes(0)) this.wpnIdx = 0;
    if (e.code === "Digit2" && this.owned.includes(1)) this.wpnIdx = 1;
    if (e.code === "Digit3" && this.owned.includes(2)) this.wpnIdx = 2;
    if (e.code === "Digit4" && this.owned.includes(3)) this.wpnIdx = 3;
  }

  onKeyUp() {}

  onMouseMove(e) {
    if (document.pointerLockElement !== this.canvas) return;
    this.yaw += (e.movementX || 0) * this.mouseSens;
    this.pitch -= (e.movementY || 0) * this.mouseSens;
    this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
  }

  onMouseDown(e) {
    if (e.button !== 0) return;
    if (this.gameOver || this.levelComplete) { this.reset(); return; }
    if (document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock?.();
      return;
    }
    this.mouseHeld = true;
    this.tryShoot();
  }

  tryShoot() {
    if (this.shootCD > 0 || this.gameOver) return;
    const w = this.weapons[this.wpnIdx];
    if (w.ammoUse > 0 && this.ammo < w.ammoUse) return;

    this.ammo -= w.ammoUse;
    this.shootCD = w.cd;
    this.muzzleFlash = 1.0;
    this.weaponKick = 1.0;

    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const sp = Math.sin(this.pitch), cp = Math.cos(this.pitch);
    const dx = sy * cp, dy = -sp, dz = -cy * cp;

    let bestT = Infinity, hitEnemy = null;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const ex = e.x - this.camX, ey = (e.y + 0.5) - this.camY, ez = e.z - this.camZ;
      const t = (ex * dx + ey * dy + ez * dz) / (dx * dx + dy * dy + dz * dz);
      if (t < 0.1 || t > w.range) continue;
      const px = this.camX + dx * t - e.x;
      const py = this.camY + dy * t - (e.y + 0.5);
      const pz = this.camZ + dz * t - e.z;
      const dist = Math.sqrt(px * px + py * py + pz * pz);
      if (dist < 0.8 && t < bestT) { bestT = t; hitEnemy = e; }
    }
    if (hitEnemy) {
      hitEnemy.hp -= w.dmg;
      hitEnemy.flinch = 0.15;
      if (hitEnemy.hp <= 0) { hitEnemy.alive = false; this.kills++; }
    }
  }

  update(dt, keyState) {
    if (this.gameOver || this.levelComplete) return;
    this.time += dt;

    if (this.shootCD > 0) this.shootCD -= dt;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt * 8;
    if (this.damageFlash > 0) this.damageFlash -= dt * 4;
    if (this.weaponKick > 0) this.weaponKick -= dt * 6;

    if (this.mouseHeld && this.shootCD <= 0 && document.pointerLockElement === this.canvas) {
      this.tryShoot();
    }

    const fwd = keyState.has("KeyW") || keyState.has("ArrowUp");
    const bwd = keyState.has("KeyS") || keyState.has("ArrowDown");
    const left = keyState.has("KeyA");
    const right = keyState.has("KeyD");

    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let vx = 0, vz = 0;
    if (fwd) { vx += sy; vz -= cy; }
    if (bwd) { vx -= sy; vz += cy; }
    if (left) { vx -= cy; vz -= sy; }
    if (right) { vx += cy; vz += sy; }

    const len = Math.hypot(vx, vz);
    this.bobActive = len > 0.01;
    if (len > 1e-5) {
      vx /= len; vz /= len;
      const step = this.moveSpeed * dt;
      const nx = this.camX + vx * step;
      const nz = this.camZ + vz * step;
      if (this.canMove(nx, this.camZ)) this.camX = nx;
      if (this.canMove(this.camX, nz)) this.camZ = nz;
      this.headBob += dt * 10;
    }

    for (const p of this.pickups) {
      if (p.collected) continue;
      const dx = p.x - this.camX, dz = p.z - this.camZ;
      if (dx * dx + dz * dz < 1.0) {
        p.collected = true;
        if (p.type === "health") this.hp = Math.min(this.maxHp, this.hp + p.value);
        if (p.type === "armor") this.armor = Math.min(this.maxArmor, this.armor + p.value);
        if (p.type === "ammo") this.ammo = Math.min(this.maxAmmo, this.ammo + p.value);
        if (p.type === "weapon" && !this.owned.includes(p.value)) {
          this.owned.push(p.value);
          this.wpnIdx = p.value;
        }
      }
    }

    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (e.flinch > 0) e.flinch -= dt;

      const dx = this.camX - e.x, dz = this.camZ - e.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 1.0) {
        this.takeDamage(e.dmg * dt * 2);
      } else if (dist > 0.5) {
        const step = e.speed * dt;
        const nx = e.x + (dx / dist) * step;
        const nz = e.z + (dz / dist) * step;
        if (this.canMove(nx, e.z, 0.4)) e.x = nx;
        if (this.canMove(e.x, nz, 0.4)) e.z = nz;
      }

      if (e.ranged && dist < e.atkRange && dist > 2) {
        e.atkTimer -= dt;
        if (e.atkTimer <= 0) {
          e.atkTimer = e.atkCD;
          const et = this.enemyTypes[e.type];
          this.projectiles.push({
            x: e.x, y: e.y + 0.8, z: e.z,
            vx: (dx / dist) * et.projSpd, vy: 0, vz: (dz / dist) * et.projSpd,
            dmg: e.dmg, life: 4,
            col: et.col.map((c) => Math.min(1, c + 0.3)),
          });
        }
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.z += pr.vz * dt;
      pr.life -= dt;

      const [c, r] = [Math.floor(pr.x / this.cellSize), Math.floor(pr.z / this.cellSize)];
      if (this.isWall(c, r) || pr.life <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const pdx = pr.x - this.camX, pdz = pr.z - this.camZ;
      const pdy = pr.y - this.camY;
      if (pdx * pdx + pdy * pdy + pdz * pdz < 0.6) {
        this.takeDamage(pr.dmg);
        this.projectiles.splice(i, 1);
      }
    }

    if (this.kills >= this.totalEnemies) {
      this.levelComplete = true;
      this.setStatus("Doom3D: LEVEL COMPLETE! All enemies eliminated. Click to restart.");
      return;
    }

    const w = this.weapons[this.wpnIdx];
    this.setStatus(
      `HP ${Math.round(this.hp)} | Armor ${this.armor} | ${w.name} [${this.ammo}] | Kills ${this.kills}/${this.totalEnemies}`
    );
  }

  takeDamage(amount) {
    let dmg = amount;
    if (this.armor > 0) {
      const absorbed = Math.min(this.armor, dmg * 0.6);
      this.armor -= absorbed;
      dmg -= absorbed;
    }
    this.hp -= dmg;
    this.damageFlash = Math.min(1, this.damageFlash + 0.4);
    if (this.hp <= 0) {
      this.hp = 0;
      this.gameOver = true;
      this.setStatus("Doom3D: YOU DIED. Click or press SPACE to restart.");
    }
  }

  initGL() {
    if (this.gl) return;
    const gl = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");
    if (!gl) { this.setStatus("Doom3D: WebGL not available."); this.gameOver = true; return; }
    this.gl = gl;

    const vsSource = `
      attribute vec3 aPos;
      attribute vec3 aNorm;
      attribute vec3 aCol;
      uniform mat4 uProj;
      uniform mat4 uView;
      varying vec3 vCol;
      varying vec3 vWPos;
      varying vec3 vNorm;
      void main(){
        gl_Position = uProj * uView * vec4(aPos, 1.0);
        vCol = aCol;
        vWPos = aPos;
        vNorm = aNorm;
      }`;

    const fsSource = `
      precision mediump float;
      varying vec3 vCol;
      varying vec3 vWPos;
      varying vec3 vNorm;
      uniform float uHud;
      uniform float uAlpha;
      uniform vec3 uCamPos;
      uniform vec3 uLP[12];
      uniform vec3 uLC[12];
      uniform float uNL;
      uniform float uDmg;
      uniform float uMuz;
      uniform vec3 uFogCol;
      uniform float uFogD;

      void main(){
        if(uHud > 0.5){ gl_FragColor = vec4(vCol, uAlpha); return; }

        vec3 n = normalize(vNorm);
        float iw = step(0.5, abs(n.x) + abs(n.z));
        vec2 wuv = abs(n.x) > 0.5 ? vWPos.zy : vWPos.xy;
        float br = floor(wuv.y * 3.0);
        vec2 bk = fract(vec2(wuv.x * 1.5 + mod(br, 2.0) * 0.5, wuv.y * 3.0));
        float mt = step(0.06, bk.x) * step(0.08, bk.y);
        float wp = mix(0.7, 1.0, mt);

        float ifl = step(0.5, n.y);
        vec2 tuv = fract(vWPos.xz * 0.7);
        float tb = step(0.04, tuv.x) * step(0.04, tuv.y) * step(tuv.x, 0.96) * step(tuv.y, 0.96);
        float fp = mix(0.82, 1.0, tb);

        float pat = mix(1.0, wp, iw) * mix(1.0, fp, ifl);
        vec3 bc = vCol * pat;

        vec3 amb = 0.05 * bc;
        vec3 dif = vec3(0.0);
        for(int i = 0; i < 12; i++){
          float a = step(float(i) + 0.5, uNL);
          vec3 tl = uLP[i] - vWPos;
          float d = length(tl);
          vec3 ld = tl / max(d, 0.001);
          float at = a / (1.0 + 0.09 * d + 0.035 * d * d);
          dif += uLC[i] * max(dot(n, ld), 0.0) * at;
        }
        vec3 lit = amb + dif * bc;

        float fd = length(vWPos - uCamPos);
        lit = mix(lit, uFogCol, clamp(1.0 - exp(-uFogD * fd), 0.0, 1.0));

        lit += vec3(uDmg * 0.45, uDmg * 0.02, uDmg * 0.02);
        lit += vec3(uMuz) * vec3(1.0, 0.8, 0.3) * 0.2;
        gl_FragColor = vec4(lit, 1.0);
      }`;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, vsSource);
    const fs = compile(gl.FRAGMENT_SHADER, fsSource);
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(p));
    this.program = p;

    this.loc = {
      aPos: gl.getAttribLocation(p, "aPos"),
      aNorm: gl.getAttribLocation(p, "aNorm"),
      aCol: gl.getAttribLocation(p, "aCol"),
      proj: gl.getUniformLocation(p, "uProj"),
      view: gl.getUniformLocation(p, "uView"),
      hud: gl.getUniformLocation(p, "uHud"),
      alpha: gl.getUniformLocation(p, "uAlpha"),
      camPos: gl.getUniformLocation(p, "uCamPos"),
      lp: gl.getUniformLocation(p, "uLP[0]"),
      lc: gl.getUniformLocation(p, "uLC[0]"),
      nl: gl.getUniformLocation(p, "uNL"),
      dmg: gl.getUniformLocation(p, "uDmg"),
      muz: gl.getUniformLocation(p, "uMuz"),
      fogCol: gl.getUniformLocation(p, "uFogCol"),
      fogD: gl.getUniformLocation(p, "uFogD"),
    };

    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(p);
  }

  addQuadN(v, p1, p2, p3, p4, n, c) {
    const [nx, ny, nz] = n;
    const [cr, cg, cb] = c;
    const push = (p) => v.push(p[0], p[1], p[2], nx, ny, nz, cr, cg, cb);
    push(p1); push(p2); push(p3);
    push(p1); push(p3); push(p4);
  }

  addBox(v, cx, cy, cz, hw, hh, hd, c) {
    this.addQuadN(v, [cx - hw, cy - hh, cz + hd], [cx + hw, cy - hh, cz + hd], [cx + hw, cy + hh, cz + hd], [cx - hw, cy + hh, cz + hd], [0, 0, 1], c);
    this.addQuadN(v, [cx + hw, cy - hh, cz - hd], [cx - hw, cy - hh, cz - hd], [cx - hw, cy + hh, cz - hd], [cx + hw, cy + hh, cz - hd], [0, 0, -1], c);
    this.addQuadN(v, [cx - hw, cy - hh, cz - hd], [cx - hw, cy - hh, cz + hd], [cx - hw, cy + hh, cz + hd], [cx - hw, cy + hh, cz - hd], [-1, 0, 0], c);
    this.addQuadN(v, [cx + hw, cy - hh, cz + hd], [cx + hw, cy - hh, cz - hd], [cx + hw, cy + hh, cz - hd], [cx + hw, cy + hh, cz + hd], [1, 0, 0], c);
    this.addQuadN(v, [cx - hw, cy + hh, cz - hd], [cx - hw, cy + hh, cz + hd], [cx + hw, cy + hh, cz + hd], [cx + hw, cy + hh, cz - hd], [0, 1, 0], c);
    this.addQuadN(v, [cx - hw, cy - hh, cz + hd], [cx - hw, cy - hh, cz - hd], [cx + hw, cy - hh, cz - hd], [cx + hw, cy - hh, cz + hd], [0, -1, 0], c);
  }

  addHudQuad(v, x1, y1, x2, y2, c) {
    const [r, g, b] = c;
    const push = (x, y) => v.push(x, y, 0, 0, 0, 0, r, g, b);
    push(x1, y1); push(x2, y1); push(x2, y2);
    push(x1, y1); push(x2, y2); push(x1, y2);
  }

  rebuildScene() {
    const gl = this.gl;
    const v = [];
    const cs = this.cellSize;
    const wh = this.wallH;
    const floorC = [0.18, 0.16, 0.14];
    const ceilC = [0.08, 0.07, 0.06];
    const wallC1 = [0.35, 0.27, 0.22];
    const wallC2 = [0.30, 0.23, 0.19];

    for (let r = 0; r < this.mapH; r++) {
      for (let c = 0; c < this.mapW; c++) {
        if (this.isWall(c, r)) continue;
        const x0 = c * cs, x1 = (c + 1) * cs;
        const z0 = r * cs, z1 = (r + 1) * cs;

        const fv = ((c * 7 + r * 13) % 5) * 0.012;
        const fc = floorC.map((v) => v + fv);
        this.addQuadN(v, [x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], [0, 1, 0], fc);
        this.addQuadN(v, [x0, wh, z0], [x0, wh, z1], [x1, wh, z1], [x1, wh, z0], [0, -1, 0], ceilC);

        if (this.isWall(c, r - 1)) {
          const wv = ((c * 3 + r * 11) % 7) * 0.008;
          this.addQuadN(v, [x0, 0, z0], [x0, wh, z0], [x1, wh, z0], [x1, 0, z0], [0, 0, 1], wallC1.map((v) => v + wv));
        }
        if (this.isWall(c, r + 1)) {
          const wv = ((c * 5 + r * 7) % 7) * 0.008;
          this.addQuadN(v, [x0, 0, z1], [x1, 0, z1], [x1, wh, z1], [x0, wh, z1], [0, 0, -1], wallC1.map((v) => v + wv));
        }
        if (this.isWall(c - 1, r)) {
          const wv = ((c * 9 + r * 5) % 7) * 0.008;
          this.addQuadN(v, [x0, 0, z0], [x0, 0, z1], [x0, wh, z1], [x0, wh, z0], [1, 0, 0], wallC2.map((v) => v + wv));
        }
        if (this.isWall(c + 1, r)) {
          const wv = ((c * 11 + r * 3) % 7) * 0.008;
          this.addQuadN(v, [x1, 0, z0], [x1, wh, z0], [x1, wh, z1], [x1, 0, z1], [-1, 0, 0], wallC2.map((v) => v + wv));
        }
      }
    }

    for (const light of this.lights) {
      this.addBox(v, light.x, 2.6, light.z, 0.12, 0.12, 0.12, [0.9, 0.7, 0.3]);
      this.addBox(v, light.x, 2.85, light.z, 0.04, 0.15, 0.04, [0.3, 0.25, 0.2]);
    }

    const data = new Float32Array(v);
    if (this.sceneVbo) gl.deleteBuffer(this.sceneVbo);
    this.sceneVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sceneVbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.sceneVertCount = data.length / 9;
  }

  setupAttribs() {
    const gl = this.gl;
    const stride = 36;
    gl.enableVertexAttribArray(this.loc.aPos);
    gl.vertexAttribPointer(this.loc.aPos, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(this.loc.aNorm);
    gl.vertexAttribPointer(this.loc.aNorm, 3, gl.FLOAT, false, stride, 12);
    gl.enableVertexAttribArray(this.loc.aCol);
    gl.vertexAttribPointer(this.loc.aCol, 3, gl.FLOAT, false, stride, 24);
  }

  buildViewMatrix() {
    const bobY = this.bobActive ? Math.sin(this.headBob) * 0.05 : 0;
    const px = this.camX, py = this.camY + bobY, pz = this.camZ;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const sp = Math.sin(this.pitch), cp = Math.cos(this.pitch);
    const fx = sy * cp, fy = -sp, fz = -cy * cp;
    const rx = cy, ry = 0, rz = sy;
    const ux = -sy * sp, uy = cp, uz = cy * sp;
    const m = new Float32Array(16);
    m[0] = rx;  m[1] = ux;  m[2] = -fx; m[3] = 0;
    m[4] = ry;  m[5] = uy;  m[6] = -fy; m[7] = 0;
    m[8] = rz;  m[9] = uz;  m[10] = -fz; m[11] = 0;
    m[12] = -(rx * px + ry * py + rz * pz);
    m[13] = -(ux * px + uy * py + uz * pz);
    m[14] = fx * px + fy * py + fz * pz;
    m[15] = 1;
    return m;
  }

  buildProjMatrix() {
    const fov = (70 * Math.PI) / 180;
    const aspect = this.canvas.width / this.canvas.height;
    const near = 0.1, far = 80;
    const f = 1 / Math.tan(fov / 2);
    const p = new Float32Array(16);
    p[0] = f / aspect;
    p[5] = f;
    p[10] = (far + near) / (near - far);
    p[11] = -1;
    p[14] = (2 * far * near) / (near - far);
    return p;
  }

  buildOrtho() {
    const w = this.canvas.width, h = this.canvas.height;
    const m = new Float32Array(16);
    m[0] = 2 / w; m[5] = -2 / h; m[10] = -1;
    m[12] = -1; m[13] = 1; m[15] = 1;
    return m;
  }

  setUniforms(proj, view) {
    const gl = this.gl;
    gl.uniformMatrix4fv(this.loc.proj, false, proj);
    gl.uniformMatrix4fv(this.loc.view, false, view);

    gl.uniform3f(this.loc.camPos, this.camX, this.camY, this.camZ);
    gl.uniform1f(this.loc.hud, 0);
    gl.uniform1f(this.loc.alpha, 1);
    gl.uniform1f(this.loc.dmg, Math.max(0, this.damageFlash));
    gl.uniform1f(this.loc.muz, Math.max(0, this.muzzleFlash));
    gl.uniform3f(this.loc.fogCol, 0.03, 0.04, 0.03);
    gl.uniform1f(this.loc.fogD, 0.055);

    const lpos = [], lcol = [];
    const numLights = Math.min(this.lights.length, 12);
    for (let i = 0; i < 12; i++) {
      if (i < numLights) {
        const l = this.lights[i];
        const flick = 1.0 + Math.sin(this.time * 6 + l.phase) * l.flicker;
        lpos.push(l.x, l.y, l.z);
        lcol.push(l.r * flick, l.g * flick, l.b * flick);
      } else {
        lpos.push(0, 0, 0);
        lcol.push(0, 0, 0);
      }
    }
    gl.uniform3fv(this.loc.lp, new Float32Array(lpos));
    gl.uniform3fv(this.loc.lc, new Float32Array(lcol));
    gl.uniform1f(this.loc.nl, numLights);
  }

  draw() {
    this.initGL();
    if (!this.gl || !this.program) return;
    if (!this.sceneVbo) this.rebuildScene();

    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.01, 0.01, 0.02, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    const proj = this.buildProjMatrix();
    const view = this.buildViewMatrix();
    this.setUniforms(proj, view);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.sceneVbo);
    this.setupAttribs();
    gl.drawArrays(gl.TRIANGLES, 0, this.sceneVertCount);

    this.drawEntities(proj, view);
    this.drawHUD();
    this.drawOverlayHUD();
  }

  drawEntities(proj, view) {
    const gl = this.gl;
    const v = [];

    for (const e of this.enemies) {
      if (!e.alive) {
        this.addBox(v, e.x, 0.05, e.z, 0.4, 0.05, 0.4, this.enemyTypes[e.type].col.map((c) => c * 0.4));
        continue;
      }
      const et = this.enemyTypes[e.type];
      const fOff = e.flinch > 0 ? (Math.random() - 0.5) * 0.1 : 0;
      const sz = et.sz;

      this.addBox(v, e.x + fOff, e.y + sz, e.z, sz * 0.8, sz, sz * 0.6, et.col);

      const hc = et.col.map((c) => Math.min(1, c + 0.15));
      this.addBox(v, e.x + fOff, e.y + sz * 2 + sz * 0.35, e.z, sz * 0.5, sz * 0.4, sz * 0.5, hc);

      const ec = [1, 0.3, 0.1];
      this.addBox(v, e.x + fOff + sz * 0.2, e.y + sz * 2 + sz * 0.4, e.z + sz * 0.45, 0.05, 0.05, 0.05, ec);
      this.addBox(v, e.x + fOff - sz * 0.2, e.y + sz * 2 + sz * 0.4, e.z + sz * 0.45, 0.05, 0.05, 0.05, ec);

      if (e.hp < e.maxHp) {
        const t = e.hp / e.maxHp;
        const barY = e.y + sz * 2 + sz * 0.9;
        const barW = 0.5;
        this.addBox(v, e.x, barY, e.z + sz * 0.6, barW, 0.03, 0.01, [0.15, 0.15, 0.15]);
        this.addBox(v, e.x - barW * (1 - t), barY, e.z + sz * 0.61, barW * t, 0.025, 0.01, [0.1, 0.9, 0.1]);
      }
    }

    for (const p of this.pickups) {
      if (p.collected) continue;
      const bob = Math.sin(this.time * 3 + p.x + p.z) * 0.08;
      const spin = this.time * 2;
      const sz = 0.18;
      if (p.type === "health") this.addBox(v, p.x, p.y + bob, p.z, sz, sz, sz, [0.2, 0.85, 0.3]);
      else if (p.type === "armor") this.addBox(v, p.x, p.y + bob, p.z, sz, sz, sz, [0.3, 0.5, 0.95]);
      else if (p.type === "ammo") this.addBox(v, p.x, p.y + bob, p.z, sz, sz, sz, [0.9, 0.8, 0.2]);
      else if (p.type === "weapon") this.addBox(v, p.x, p.y + bob, p.z, sz * 1.3, sz, sz * 0.8, [0.95, 0.6, 0.15]);
    }

    for (const pr of this.projectiles) {
      this.addBox(v, pr.x, pr.y, pr.z, 0.1, 0.1, 0.1, pr.col);
    }

    if (v.length === 0) return;
    if (!this.dynVbo) this.dynVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.dynVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);
    this.setupAttribs();
    gl.drawArrays(gl.TRIANGLES, 0, v.length / 9);
  }

  drawHUD() {
    const gl = this.gl;
    const w = this.canvas.width, h = this.canvas.height;
    const v = [];

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const ortho = this.buildOrtho();
    const identity = new Float32Array(16);
    identity[0] = identity[5] = identity[10] = identity[15] = 1;
    gl.uniformMatrix4fv(this.loc.proj, false, ortho);
    gl.uniformMatrix4fv(this.loc.view, false, identity);
    gl.uniform1f(this.loc.hud, 1);
    gl.uniform1f(this.loc.alpha, 1);

    const cs = 12;
    this.addHudQuad(v, w / 2 - cs, h / 2 - 1.5, w / 2 + cs, h / 2 + 1.5, [0.9, 0.9, 0.9]);
    this.addHudQuad(v, w / 2 - 1.5, h / 2 - cs, w / 2 + 1.5, h / 2 + cs, [0.9, 0.9, 0.9]);

    const barH = 8, barW = 140, margin = 16;
    const barY = h - margin - 60;

    this.addHudQuad(v, margin, barY, margin + barW, barY + barH, [0.15, 0.08, 0.08]);
    const hpW = (this.hp / this.maxHp) * barW;
    this.addHudQuad(v, margin, barY, margin + hpW, barY + barH, [0.85, 0.15, 0.15]);

    this.addHudQuad(v, margin, barY + 14, margin + barW, barY + 14 + barH, [0.08, 0.08, 0.15]);
    const arW = (this.armor / this.maxArmor) * barW;
    this.addHudQuad(v, margin, barY + 14, margin + arW, barY + 14 + barH, [0.2, 0.4, 0.9]);

    this.addHudQuad(v, w - margin - barW, barY, w - margin, barY + barH, [0.15, 0.12, 0.05]);
    const amW = (this.ammo / this.maxAmmo) * barW;
    this.addHudQuad(v, w - margin - barW, barY, w - margin - barW + amW, barY + barH, [0.9, 0.75, 0.15]);

    const bobX = this.bobActive ? Math.sin(this.headBob * 0.5) * 6 : 0;
    const bobY = this.bobActive ? Math.abs(Math.cos(this.headBob)) * 4 : 0;
    const kickY = Math.max(0, this.weaponKick) * 30;
    const bx = w * 0.7 + bobX, by = h - 20 + bobY + kickY;

    const shapes = [
      [
        { dx: -20, dy: -50, dw: 18, dh: 35, c: [0.85, 0.65, 0.5] },
        { dx: 10, dy: -42, dw: 18, dh: 35, c: [0.85, 0.65, 0.5] },
      ],
      [
        { dx: -8, dy: -90, dw: 16, dh: 55, c: [0.35, 0.35, 0.4] },
        { dx: -12, dy: -35, dw: 24, dh: 42, c: [0.22, 0.2, 0.18] },
        { dx: -5, dy: -95, dw: 10, dh: 8, c: [0.55, 0.55, 0.6] },
      ],
      [
        { dx: -18, dy: -115, dw: 36, dh: 70, c: [0.32, 0.32, 0.36] },
        { dx: -10, dy: -45, dw: 20, dh: 52, c: [0.4, 0.25, 0.15] },
        { dx: -22, dy: -82, dw: 44, dh: 12, c: [0.48, 0.48, 0.52] },
      ],
      [
        { dx: -24, dy: -125, dw: 10, dh: 85, c: [0.36, 0.36, 0.4] },
        { dx: -6, dy: -125, dw: 10, dh: 85, c: [0.36, 0.36, 0.4] },
        { dx: 12, dy: -125, dw: 10, dh: 85, c: [0.36, 0.36, 0.4] },
        { dx: -14, dy: -40, dw: 30, dh: 48, c: [0.24, 0.24, 0.28] },
      ],
    ];

    const wpnParts = shapes[this.wpnIdx] || shapes[1];
    for (const p of wpnParts) {
      this.addHudQuad(v, bx + p.dx, by + p.dy, bx + p.dx + p.dw, by + p.dy + p.dh, p.c);
    }

    if (this.muzzleFlash > 0.2) {
      const fs = 15 * this.muzzleFlash;
      const fy = by - 100;
      this.addHudQuad(v, bx - fs, fy - fs, bx + fs, fy + fs, [1, 0.9, 0.4]);
    }

    if (!this.hudVbo) this.hudVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.hudVbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.DYNAMIC_DRAW);
    this.setupAttribs();
    gl.drawArrays(gl.TRIANGLES, 0, v.length / 9);

    if (this.damageFlash > 0) {
      const dv = [];
      this.addHudQuad(dv, 0, 0, w, h, [0.8, 0, 0]);
      gl.uniform1f(this.loc.alpha, this.damageFlash * 0.35);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dv), gl.DYNAMIC_DRAW);
      this.setupAttribs();
      gl.drawArrays(gl.TRIANGLES, 0, dv.length / 9);
      gl.uniform1f(this.loc.alpha, 1);
    }

    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST);
  }

  drawOverlayHUD() {
    if (!this.hudOverlay) {
      this.hudOverlay = document.createElement("canvas");
      this.hudOverlay.width = this.canvas.width;
      this.hudOverlay.height = this.canvas.height;
      Object.assign(this.hudOverlay.style, {
        position: "absolute", top: "0", left: "0",
        width: "100%", height: "100%",
        pointerEvents: "none", zIndex: "1",
      });
      this.canvas.parentElement.appendChild(this.hudOverlay);
      this.hudCtx = this.hudOverlay.getContext("2d");
    }

    const ctx = this.hudCtx;
    const w = this.hudOverlay.width, h = this.hudOverlay.height;
    ctx.clearRect(0, 0, w, h);

    const barY = h - 76;

    ctx.font = "bold 11px monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    ctx.fillStyle = "#ef4444";
    ctx.fillText("HEALTH", 16, barY - 14);
    ctx.font = "bold 22px monospace";
    ctx.fillText(`${Math.round(this.hp)}`, 16, barY + 10);

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#60a5fa";
    ctx.fillText("ARMOR", 16, barY + 14 - 14 + 12);
    ctx.font = "bold 14px monospace";
    ctx.fillText(`${Math.round(this.armor)}`, 16, barY + 14 + 10 + 10);

    ctx.textAlign = "right";
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#fbbf24";
    ctx.fillText("AMMO", w - 16, barY - 14);
    ctx.font = "bold 22px monospace";
    ctx.fillText(`${this.ammo}`, w - 16, barY + 10);

    ctx.textAlign = "center";
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = "#e2e8f0";
    const wpn = this.weapons[this.wpnIdx];
    ctx.fillText(wpn.name.toUpperCase(), w / 2, h - 22);

    ctx.font = "bold 12px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`KILLS: ${this.kills}/${this.totalEnemies}`, w / 2, h - 8);

    if (this.gameOver) {
      ctx.fillStyle = "rgba(120, 0, 0, 0.6)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 42px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("YOU DIED", w / 2, h / 2 - 20);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "18px sans-serif";
      ctx.fillText("Click or SPACE to restart", w / 2, h / 2 + 25);
    }

    if (this.levelComplete) {
      ctx.fillStyle = "rgba(0, 60, 0, 0.5)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#4ade80";
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("LEVEL COMPLETE", w / 2, h / 2 - 20);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "18px sans-serif";
      ctx.fillText("All enemies eliminated!", w / 2, h / 2 + 20);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "16px sans-serif";
      ctx.fillText("Click or SPACE to restart", w / 2, h / 2 + 50);
    }
  }
}
