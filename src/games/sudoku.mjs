export class SudokuGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;

    this.size = 9;
    this.selectedRow = 0;
    this.selectedCol = 0;

    this.basePadding = 40;

    this.gameOver = false;
    this.autoRestart = false;

    this.puzzle = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9],
    ];

    this.reset();
  }

  reset() {
    // Deep copy starting puzzle into current grid
    this.grid = this.puzzle.map((row) => row.slice());
    this.fixed = this.puzzle.map((row) => row.map((v) => v !== 0)); // true if pre-filled

    this.selectedRow = 0;
    this.selectedCol = 0;
    this.gameOver = false;

    this.setStatus(
      "Sudoku: Use ← ↑ → ↓ to move, 1–9 to fill, Backspace to clear."
    );
  }

  onKeyDown(e) {
    if (this.gameOver) {
      if (e.code === "Space" || e.code === "Enter") {
        this.reset();
      }
      return;
    }

    const key = e.code;

    if (key === "ArrowUp") {
      this.selectedRow = (this.selectedRow + this.size - 1) % this.size;
      return;
    }
    if (key === "ArrowDown") {
      this.selectedRow = (this.selectedRow + 1) % this.size;
      return;
    }
    if (key === "ArrowLeft") {
      this.selectedCol = (this.selectedCol + this.size - 1) % this.size;
      return;
    }
    if (key === "ArrowRight") {
      this.selectedCol = (this.selectedCol + 1) % this.size;
      return;
    }

    // Clear cell
    if (key === "Backspace" || key === "Delete") {
      if (!this.fixed[this.selectedRow][this.selectedCol]) {
        this.grid[this.selectedRow][this.selectedCol] = 0;
      }
      return;
    }

    // Number input: Digit1-9, Numpad1-9
    const num = this.keyToNumber(key);
    if (num >= 1 && num <= 9) {
      const r = this.selectedRow;
      const c = this.selectedCol;
      if (this.fixed[r][c]) {
        return;
      }
      if (this.isValidMove(r, c, num)) {
        this.grid[r][c] = num;
        if (this.isSolved()) {
          this.gameOver = true;
          this.setStatus("Sudoku: Solved! Press SPACE to play again.");
        }
      } else {
        this.setStatus("Sudoku: Invalid move (conflict in row/column/box).");
      }
    }
  }

  onKeyUp() {}

  keyToNumber(code) {
    if (code.startsWith("Digit")) {
      const n = Number(code.slice(5));
      return Number.isNaN(n) ? 0 : n;
    }
    if (code.startsWith("Numpad")) {
      const n = Number(code.slice(6));
      return Number.isNaN(n) ? 0 : n;
    }
    return 0;
  }

  isValidMove(row, col, value) {
    // row
    for (let c = 0; c < this.size; c++) {
      if (c !== col && this.grid[row][c] === value) return false;
    }
    // column
    for (let r = 0; r < this.size; r++) {
      if (r !== row && this.grid[r][col] === value) return false;
    }
    // box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
      for (let c = boxCol; c < boxCol + 3; c++) {
        if ((r !== row || c !== col) && this.grid[r][c] === value) return false;
      }
    }
    return true;
  }

  isSolved() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const v = this.grid[r][c];
        if (v < 1 || v > 9) return false;
        if (!this.isValidMove(r, c, v)) return false;
      }
    }
    return true;
  }

  update() {
    // Sudoku is turn-based; nothing needed per frame.
  }

  drawBackground(boardSize) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#020617");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Card behind the board
    const cardWidth = boardSize + 40;
    const cardHeight = boardSize + 40;
    const cardX = (w - cardWidth) / 2;
    const cardY = (h - cardHeight) / 2;
    ctx.fillStyle = "rgba(15,23,42,0.9)";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 18);
    ctx.fill();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    const boardSize = Math.min(w, h) - this.basePadding * 2;
    const cellSize = boardSize / this.size;
    const offsetX = (w - boardSize) / 2;
    const offsetY = (h - boardSize) / 2;

    this.drawBackground(boardSize);

    // Highlight selected cell
    ctx.save();
    ctx.translate(offsetX, offsetY);

    ctx.fillStyle = "rgba(56,189,248,0.25)";
    ctx.fillRect(
      this.selectedCol * cellSize,
      this.selectedRow * cellSize,
      cellSize,
      cellSize
    );

    // Shaded 3x3 boxes
    ctx.fillStyle = "rgba(15,23,42,0.4)";
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        if ((br + bc) % 2 === 0) continue;
        ctx.fillRect(
          bc * 3 * cellSize,
          br * 3 * cellSize,
          3 * cellSize,
          3 * cellSize
        );
      }
    }

    // Grid lines
    ctx.strokeStyle = "rgba(51,65,85,0.9)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.size; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(boardSize, i * cellSize);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, boardSize);
      ctx.stroke();
    }

    // Thicker lines for 3x3 boxes
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 3;
    for (let i = 0; i <= this.size; i += 3) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize + 1.5);
      ctx.lineTo(boardSize, i * cellSize + 1.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i * cellSize + 1.5, 0);
      ctx.lineTo(i * cellSize + 1.5, boardSize);
      ctx.stroke();
    }

    // Numbers
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${cellSize * 0.55}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const v = this.grid[r][c];
        if (!v) continue;

        const x = c * cellSize + cellSize / 2;
        const y = r * cellSize + cellSize / 2;

        if (this.fixed[r][c]) {
          ctx.fillStyle = "#e5e7eb";
        } else {
          ctx.fillStyle = "#38bdf8";
        }
        ctx.fillText(String(v), x, y + 1);
      }
    }

    ctx.restore();
  }
}

