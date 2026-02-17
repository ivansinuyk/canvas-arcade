// Very simple WebGL 3D "Doom-like" room using vanilla WebGL.
// WASD to move, mouse to look (after click), escape to release pointer.

export class Doom3DGame {
  constructor(canvas, _ctx2d, setStatus) {
    this.canvas = canvas;
    this.setStatus = setStatus;

    this.gl = null;
    this.program = null;
    this.buffers = null;

    // Camera state
    this.camX = 0;
    this.camY = 1.0;
    this.camZ = 4;
    this.yaw = 0; // rotation around Y

    this.moveSpeed = 4.0;
    this.mouseSensitivity = 0.0025;

    this.gameOver = false;
    this.autoRestart = false;

    this.setStatus(
      "Doom3D: Click to lock mouse, move with WASD, Esc to release."
    );
  }

  reset() {
    this.camX = 0;
    this.camY = 1.0;
    this.camZ = 4;
    this.yaw = 0;
    this.gameOver = false;

    this.setStatus(
      "Doom3D: Click to lock mouse, move with WASD, Esc to release."
    );
  }

  onKeyDown(e) {
    if (e.code === "Escape") {
      if (document.pointerLockElement === this.canvas) {
        document.exitPointerLock?.();
      }
    }
  }

  onKeyUp() {}

  onMouseMove(e) {
    if (document.pointerLockElement !== this.canvas) return;
    const dx = e.movementX || 0;
    this.yaw += dx * this.mouseSensitivity;
  }

  onMouseDown(e) {
    if (e.button === 0 && document.pointerLockElement !== this.canvas) {
      this.canvas.requestPointerLock?.();
    }
  }

  update(dt, keyState) {
    if (this.gameOver) return;

    const forward =
      keyState.has("KeyW") || keyState.has("ArrowUp");
    const backward =
      keyState.has("KeyS") || keyState.has("ArrowDown");
    const left = keyState.has("KeyA");
    const right = keyState.has("KeyD");

    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    let vx = 0;
    let vz = 0;

    if (forward) {
      vx += sinYaw;
      vz += -cosYaw;
    }
    if (backward) {
      vx -= sinYaw;
      vz -= -cosYaw;
    }
    if (left) {
      vx += -cosYaw;
      vz += -sinYaw;
    }
    if (right) {
      vx -= -cosYaw;
      vz -= -sinYaw;
    }

    const len = Math.hypot(vx, vz);
    if (len > 0.0001) {
      vx /= len;
      vz /= len;
      const step = this.moveSpeed * dt;
      this.camX += vx * step;
      this.camZ += vz * step;
    }
  }

  ensureGl() {
    if (this.gl) return;

    // Try several context names for maximum compatibility
    let gl =
      this.canvas.getContext("webgl") ||
      this.canvas.getContext("experimental-webgl") ||
      this.canvas.getContext("webgl2");
    if (!gl) {
      this.setStatus(
        "Doom3D: WebGL context could not be created. This browser or device may not support hardware-accelerated 3D."
      );
      this.gameOver = true;
      return;
    }
    this.gl = gl;

    const vsSource = `
      attribute vec3 aPosition;
      attribute vec3 aColor;
      uniform mat4 uProjection;
      uniform mat4 uView;
      varying vec3 vColor;
      void main() {
        gl_Position = uProjection * uView * vec4(aPosition, 1.0);
        vColor = aColor;
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec3 vColor;
      void main() {
        gl_FragColor = vec4(vColor, 1.0);
      }
    `;

    const vertShader = this.createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragShader = this.createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    this.program = this.createProgram(gl, vertShader, fragShader);

    this.buffers = this.createSceneBuffers(gl);

    gl.enable(gl.DEPTH_TEST);
  }

  createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  createProgram(gl, vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  createSceneBuffers(gl) {
    const vertices = [];

    const addQuad = (p1, p2, p3, p4, color) => {
      const [r, g, b] = color;
      const pushVert = (p) => {
        vertices.push(p[0], p[1], p[2], r, g, b);
      };
      // Triangle 1
      pushVert(p1);
      pushVert(p2);
      pushVert(p3);
      // Triangle 2
      pushVert(p1);
      pushVert(p3);
      pushVert(p4);
    };

    // Room dimensions
    const halfSize = 6;
    const floorY = 0;
    const ceilY = 3;

    // Floor
    addQuad(
      [-halfSize, floorY, -halfSize],
      [halfSize, floorY, -halfSize],
      [halfSize, floorY, halfSize],
      [-halfSize, floorY, halfSize],
      [0.12, 0.19, 0.25]
    );

    // Ceiling
    addQuad(
      [-halfSize, ceilY, -halfSize],
      [-halfSize, ceilY, halfSize],
      [halfSize, ceilY, halfSize],
      [halfSize, ceilY, -halfSize],
      [0.05, 0.07, 0.12]
    );

    // Walls (front/back/left/right)
    const wallColor1 = [0.23, 0.34, 0.46];
    const wallColor2 = [0.18, 0.25, 0.36];

    // Back wall (z = -halfSize)
    addQuad(
      [-halfSize, floorY, -halfSize],
      [-halfSize, ceilY, -halfSize],
      [halfSize, ceilY, -halfSize],
      [halfSize, floorY, -halfSize],
      wallColor1
    );

    // Front wall (z = halfSize)
    addQuad(
      [-halfSize, floorY, halfSize],
      [halfSize, floorY, halfSize],
      [halfSize, ceilY, halfSize],
      [-halfSize, ceilY, halfSize],
      wallColor1
    );

    // Left wall (x = -halfSize)
    addQuad(
      [-halfSize, floorY, -halfSize],
      [-halfSize, floorY, halfSize],
      [-halfSize, ceilY, halfSize],
      [-halfSize, ceilY, -halfSize],
      wallColor2
    );

    // Right wall (x = halfSize)
    addQuad(
      [halfSize, floorY, -halfSize],
      [halfSize, ceilY, -halfSize],
      [halfSize, ceilY, halfSize],
      [halfSize, floorY, halfSize],
      wallColor2
    );

    // A few inner "pillars" (just tall boxes with 4 sides)
    const pillarColor = [0.45, 0.26, 0.55];
    const addPillar = (cx, cz, size, height) => {
      const s = size / 2;
      const y0 = floorY;
      const y1 = y0 + height;
      // front
      addQuad(
        [cx - s, y0, cz + s],
        [cx + s, y0, cz + s],
        [cx + s, y1, cz + s],
        [cx - s, y1, cz + s],
        pillarColor
      );
      // back
      addQuad(
        [cx - s, y0, cz - s],
        [cx - s, y1, cz - s],
        [cx + s, y1, cz - s],
        [cx + s, y0, cz - s],
        pillarColor
      );
      // left
      addQuad(
        [cx - s, y0, cz - s],
        [cx - s, y0, cz + s],
        [cx - s, y1, cz + s],
        [cx - s, y1, cz - s],
        pillarColor
      );
      // right
      addQuad(
        [cx + s, y0, cz - s],
        [cx + s, y1, cz - s],
        [cx + s, y1, cz + s],
        [cx + s, y0, cz + s],
        pillarColor
      );
    };

    addPillar(-2.5, -1.5, 1.2, 2.8);
    addPillar(2.0, 1.8, 1.0, 2.4);
    addPillar(0.0, 0.0, 1.4, 2.2);

    const vertexData = new Float32Array(vertices);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

    return {
      vbo,
      vertexCount: vertexData.length / 6,
    };
  }

  draw() {
    this.ensureGl();
    if (!this.gl || !this.program || !this.buffers) return;

    const gl = this.gl;
    const program = this.program;
    const { vbo, vertexCount } = this.buffers;

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.01, 0.01, 0.02, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    // Attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    const stride = 6 * 4;
    const aPosition = gl.getAttribLocation(program, "aPosition");
    const aColor = gl.getAttribLocation(program, "aColor");
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(aColor);
    gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, stride, 3 * 4);

    // Projection matrix
    const fov = (60 * Math.PI) / 180;
    const aspect = this.canvas.width / this.canvas.height;
    const near = 0.1;
    const far = 100.0;
    const proj = new Float32Array(16);
    const f = 1.0 / Math.tan(fov / 2);
    proj[0] = f / aspect;
    proj[5] = f;
    proj[10] = (far + near) / (near - far);
    proj[11] = -1;
    proj[14] = (2 * far * near) / (near - far);
    proj[1] = proj[2] = proj[3] =
      proj[4] = proj[6] = proj[7] = proj[8] = proj[9] = proj[12] = proj[13] = proj[15] = 0;

    // View matrix (yaw + translation)
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    // Camera basis
    const fx = sinYaw;
    const fz = -cosYaw;
    const sx = cosYaw;
    const sz = sinYaw;
    const ux = 0;
    const uy = 1;
    const uz = 0;

    const px = this.camX;
    const py = this.camY;
    const pz = this.camZ;

    const view = new Float32Array(16);
    view[0] = sx;
    view[1] = ux;
    view[2] = -fx;
    view[3] = 0;
    view[4] = 0;
    view[5] = uy;
    view[6] = -0;
    view[7] = 0;
    view[8] = sz;
    view[9] = uz;
    view[10] = -fz;
    view[11] = 0;
    view[12] = -(sx * px + 0 * py + sz * pz);
    view[13] = -(ux * px + uy * py + uz * pz);
    view[14] = -(-fx * px + -0 * py + -fz * pz);
    view[15] = 1;

    const uProjection = gl.getUniformLocation(program, "uProjection");
    const uView = gl.getUniformLocation(program, "uView");
    gl.uniformMatrix4fv(uProjection, false, proj);
    gl.uniformMatrix4fv(uView, false, view);

    gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
  }
}

