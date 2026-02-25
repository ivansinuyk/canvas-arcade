export class TetrisGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;

    this.cols = 10;
    this.rows = 20;
    this.cellSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;

    this.gameOver = false;
    this.autoRestart = false;
    this.score = 0;
    this.bestScore = 0;
    this.linesCleared = 0;
    this.level = 1;

    this.board = [];
    this.current = null;
    this.next = null;
    this.dropTimer = 0;
    this.dropInterval = 0;

    this.flashRows = [];
    this.flashTimer = 0;

    this.pieces = {
      I: { shape: [[1, 1, 1, 1]], color: "#06b6d4" },
      O: { shape: [[1, 1], [1, 1]], color: "#eab308" },
      T: { shape: [[0, 1, 0], [1, 1, 1]], color: "#a855f7" },
      S: { shape: [[0, 1, 1], [1, 1, 0]], color: "#22c55e" },
      Z: { shape: [[1, 1, 0], [0, 1, 1]], color: "#ef4444" },
      J: { shape: [[1, 0, 0], [1, 1, 1]], color: "#3b82f6" },
      L: { shape: [[0, 0, 1], [1, 1, 1]], color: "#f97316" },
    };
    this.pieceNames = Object.keys(this.pieces);
    this.bag = [];
  }

  reset() {
    this.cellSize = Math.floor(Math.min(
      (this.canvas.width - 120) / this.cols,
      (this.canvas.height - 40) / this.rows
    ));
    this.offsetX = Math.floor((this.canvas.width - this.cols * this.cellSize - 100) / 2);
    this.offsetY = Math.floor((this.canvas.height - this.rows * this.cellSize) / 2);

    this.board = [];
    for (let r = 0; r < this.rows; r++) {
      this.board.push(new Array(this.cols).fill(null));
    }

    this.score = 0;
    this.linesCleared = 0;
    this.level = 1;
    this.gameOver = false;
    this.dropTimer = 0;
    this.dropInterval = 0.8;
    this.flashRows = [];
    this.flashTimer = 0;
    this.bag = [];

    this.next = this.randomPiece();
    this.spawnPiece();

    this.setStatus("Tetris: ← → move, ↑ rotate, ↓ soft drop, SPACE hard drop");
  }

  randomPiece() {
    if (this.bag.length === 0) {
      this.bag = [...this.pieceNames];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    const name = this.bag.pop();
    const piece = this.pieces[name];
    return {
      name,
      shape: piece.shape.map((row) => [...row]),
      color: piece.color,
    };
  }

  spawnPiece() {
    this.current = this.next;
    this.next = this.randomPiece();
    this.current.row = 0;
    this.current.col = Math.floor((this.cols - this.current.shape[0].length) / 2);

    if (this.collides(this.current.shape, this.current.row, this.current.col)) {
      this.gameOver = true;
      this.bestScore = Math.max(this.bestScore, this.score);
      this.setStatus(
        `Tetris: Game Over! Score ${this.score}, Best ${this.bestScore} — press SPACE to restart`
      );
    }
  }

  collides(shape, row, col) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const br = row + r;
        const bc = col + c;
        if (bc < 0 || bc >= this.cols || br >= this.rows) return true;
        if (br >= 0 && this.board[br][bc]) return true;
      }
    }
    return false;
  }

  rotate(shape) {
    const rows = shape.length;
    const cols = shape[0].length;
    const rotated = [];
    for (let c = 0; c < cols; c++) {
      rotated.push([]);
      for (let r = rows - 1; r >= 0; r--) {
        rotated[c].push(shape[r][c]);
      }
    }
    return rotated;
  }

  lockPiece() {
    const { shape, row, col, color } = this.current;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const br = row + r;
        if (br >= 0) this.board[br][col + c] = color;
      }
    }
    this.checkLines();
    this.spawnPiece();
  }

  checkLines() {
    const full = [];
    for (let r = 0; r < this.rows; r++) {
      if (this.board[r].every((cell) => cell !== null)) {
        full.push(r);
      }
    }
    if (full.length === 0) return;

    this.flashRows = full;
    this.flashTimer = 0.3;

    const points = [0, 100, 300, 500, 800];
    this.score += (points[full.length] || 800) * this.level;
    this.linesCleared += full.length;
    this.level = Math.floor(this.linesCleared / 10) + 1;
    this.dropInterval = Math.max(0.05, 0.8 - (this.level - 1) * 0.07);

    for (const r of full) {
      this.board.splice(r, 1);
      this.board.unshift(new Array(this.cols).fill(null));
    }
  }

  getGhostRow() {
    let row = this.current.row;
    while (!this.collides(this.current.shape, row + 1, this.current.col)) {
      row++;
    }
    return row;
  }

  onKeyDown(e) {
    if (this.gameOver) {
      if (e.code === "Space" || e.code === "Enter") {
        this.reset();
      }
      return;
    }

    const cur = this.current;
    if (!cur) return;

    switch (e.code) {
      case "ArrowLeft":
      case "KeyA":
        if (!this.collides(cur.shape, cur.row, cur.col - 1)) cur.col--;
        break;
      case "ArrowRight":
      case "KeyD":
        if (!this.collides(cur.shape, cur.row, cur.col + 1)) cur.col++;
        break;
      case "ArrowDown":
      case "KeyS":
        if (!this.collides(cur.shape, cur.row + 1, cur.col)) {
          cur.row++;
          this.score += 1;
        }
        break;
      case "ArrowUp":
      case "KeyW": {
        const rotated = this.rotate(cur.shape);
        const kicks = [0, -1, 1, -2, 2];
        for (const kick of kicks) {
          if (!this.collides(rotated, cur.row, cur.col + kick)) {
            cur.shape = rotated;
            cur.col += kick;
            break;
          }
        }
        break;
      }
      case "Space":
        e.preventDefault();
        while (!this.collides(cur.shape, cur.row + 1, cur.col)) {
          cur.row++;
          this.score += 2;
        }
        this.lockPiece();
        break;
    }
  }

  onKeyUp() {}

  update(dt) {
    if (this.gameOver) return;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      return;
    }
    this.flashRows = [];

    this.dropTimer += dt;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      if (!this.collides(this.current.shape, this.current.row + 1, this.current.col)) {
        this.current.row++;
      } else {
        this.lockPiece();
      }
    }

    if (!this.gameOver) {
      this.setStatus(
        `Tetris: Lv${this.level} | Score ${this.score} | Lines ${this.linesCleared} | Best ${this.bestScore}`
      );
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#0f0a1e");
    g.addColorStop(1, "#1a0e2e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    this.drawBoard(ctx);
    this.drawGhost(ctx);
    this.drawCurrent(ctx);
    this.drawNext(ctx);
    this.drawFlash(ctx);

    if (this.gameOver) this.drawOverlay(ctx, w, h);
  }

  drawBoard(ctx) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    const cs = this.cellSize;

    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(ox - 2, oy - 2, this.cols * cs + 4, this.rows * cs + 4);

    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= this.rows; r++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + r * cs);
      ctx.lineTo(ox + this.cols * cs, oy + r * cs);
      ctx.stroke();
    }
    for (let c = 0; c <= this.cols; c++) {
      ctx.beginPath();
      ctx.moveTo(ox + c * cs, oy);
      ctx.lineTo(ox + c * cs, oy + this.rows * cs);
      ctx.stroke();
    }

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.board[r][c]) continue;
        this.drawCell(ctx, ox + c * cs, oy + r * cs, cs, this.board[r][c]);
      }
    }

    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox - 2, oy - 2, this.cols * cs + 4, this.rows * cs + 4);
  }

  drawCell(ctx, x, y, size, color) {
    const pad = 1;
    ctx.fillStyle = color;
    ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);

    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.fillRect(x + pad, y + pad, size - pad * 2, (size - pad * 2) / 3);

    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.fillRect(x + pad, y + pad + ((size - pad * 2) * 2) / 3, size - pad * 2, (size - pad * 2) / 3);
  }

  drawGhost(ctx) {
    if (!this.current) return;
    const ghostRow = this.getGhostRow();
    const { shape, col } = this.current;
    const ox = this.offsetX;
    const oy = this.offsetY;
    const cs = this.cellSize;

    ctx.globalAlpha = 0.2;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const x = ox + (col + c) * cs;
        const y = oy + (ghostRow + r) * cs;
        ctx.fillStyle = this.current.color;
        ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawCurrent(ctx) {
    if (!this.current) return;
    const { shape, row, col, color } = this.current;
    const ox = this.offsetX;
    const oy = this.offsetY;
    const cs = this.cellSize;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        this.drawCell(ctx, ox + (col + c) * cs, oy + (row + r) * cs, cs, color);
      }
    }
  }

  drawNext(ctx) {
    if (!this.next) return;
    const previewX = this.offsetX + this.cols * this.cellSize + 20;
    const previewY = this.offsetY + 10;
    const previewSize = 20;

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("NEXT", previewX, previewY);

    ctx.fillStyle = "rgba(10,10,26,0.7)";
    ctx.fillRect(previewX - 4, previewY + 22, previewSize * 5 + 8, previewSize * 4 + 8);
    ctx.strokeStyle = "#4338ca";
    ctx.lineWidth = 1;
    ctx.strokeRect(previewX - 4, previewY + 22, previewSize * 5 + 8, previewSize * 4 + 8);

    const { shape, color } = this.next;
    const sx = previewX + (4 - shape[0].length) * previewSize / 2;
    const sy = previewY + 26 + (4 - shape.length) * previewSize / 2;

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        this.drawCell(ctx, sx + c * previewSize, sy + r * previewSize, previewSize, color);
      }
    }

    const infoY = previewY + 140;
    ctx.fillStyle = "#a5b4fc";
    ctx.font = "13px sans-serif";
    ctx.fillText(`Level ${this.level}`, previewX, infoY);
    ctx.fillText(`Lines ${this.linesCleared}`, previewX, infoY + 22);
    ctx.fillText(`Score`, previewX, infoY + 52);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`${this.score}`, previewX, infoY + 70);
  }

  drawFlash(ctx) {
    if (this.flashRows.length === 0) return;
    const ox = this.offsetX;
    const oy = this.offsetY;
    const cs = this.cellSize;
    const alpha = 0.5 + Math.sin(this.flashTimer * 30) * 0.3;

    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    for (const r of this.flashRows) {
      ctx.fillRect(ox, oy + r * cs, this.cols * cs, cs);
    }
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
