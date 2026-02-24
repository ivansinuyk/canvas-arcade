// Full Chess game: player (white) vs simple AI (black).
// Click to select a piece, then click a highlighted square to move.

const W = "w", B = "b";
const KING = "K", QUEEN = "Q", ROOK = "R", BISHOP = "B", KNIGHT = "N", PAWN = "P";

const UNICODE = {
  wK: "\u2654", wQ: "\u2655", wR: "\u2656", wB: "\u2657", wN: "\u2658", wP: "\u2659",
  bK: "\u265A", bQ: "\u265B", bR: "\u265C", bB: "\u265D", bN: "\u265E", bP: "\u265F",
};

function piece(color, type) { return { color, type }; }

function initialBoard() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  const order = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];
  for (let c = 0; c < 8; c++) {
    b[0][c] = piece(B, order[c]);
    b[1][c] = piece(B, PAWN);
    b[6][c] = piece(W, PAWN);
    b[7][c] = piece(W, order[c]);
  }
  return b;
}

function cloneBoard(board) {
  return board.map((row) => row.map((p) => (p ? { ...p } : null)));
}

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function isEnemy(board, r, c, color) {
  return inBounds(r, c) && board[r][c] && board[r][c].color !== color;
}

function isEmpty(board, r, c) {
  return inBounds(r, c) && !board[r][c];
}

function rawMoves(board, r, c) {
  const p = board[r][c];
  if (!p) return [];
  const moves = [];
  const add = (tr, tc) => { if (inBounds(tr, tc)) moves.push([tr, tc]); };
  const addIfEmpty = (tr, tc) => { if (isEmpty(board, tr, tc)) { moves.push([tr, tc]); return true; } return false; };
  const addIfCapture = (tr, tc) => { if (isEnemy(board, tr, tc, p.color)) moves.push([tr, tc]); };
  const slide = (dr, dc) => {
    for (let i = 1; i < 8; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (!inBounds(nr, nc)) break;
      if (!board[nr][nc]) { moves.push([nr, nc]); continue; }
      if (board[nr][nc].color !== p.color) moves.push([nr, nc]);
      break;
    }
  };

  switch (p.type) {
    case PAWN: {
      const dir = p.color === W ? -1 : 1;
      const startRow = p.color === W ? 6 : 1;
      if (addIfEmpty(r + dir, c) && r === startRow) addIfEmpty(r + dir * 2, c);
      addIfCapture(r + dir, c - 1);
      addIfCapture(r + dir, c + 1);
      break;
    }
    case KNIGHT:
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        const nr = r + dr, nc = c + dc;
        if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color !== p.color)) add(nr, nc);
      }
      break;
    case BISHOP: slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1); break;
    case ROOK: slide(-1,0); slide(1,0); slide(0,-1); slide(0,1); break;
    case QUEEN: slide(-1,-1); slide(-1,1); slide(1,-1); slide(1,1); slide(-1,0); slide(1,0); slide(0,-1); slide(0,1); break;
    case KING:
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) && (!board[nr][nc] || board[nr][nc].color !== p.color)) add(nr, nc);
        }
      }
      break;
  }
  return moves;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === color && board[r][c].type === KING) return [r, c];
  return null;
}

function isInCheck(board, color) {
  const kp = findKing(board, color);
  if (!kp) return true;
  const enemy = color === W ? B : W;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === enemy)
        for (const [tr, tc] of rawMoves(board, r, c))
          if (tr === kp[0] && tc === kp[1]) return true;
  return false;
}

function applyMove(board, fr, fc, tr, tc) {
  const b = cloneBoard(board);
  const p = b[fr][fc];
  b[tr][tc] = p;
  b[fr][fc] = null;
  if (p.type === PAWN) {
    const promoRow = p.color === W ? 0 : 7;
    if (tr === promoRow) p.type = QUEEN;
  }
  return b;
}

function legalMoves(board, r, c) {
  const p = board[r][c];
  if (!p) return [];
  return rawMoves(board, r, c).filter(([tr, tc]) => {
    const nb = applyMove(board, r, c, tr, tc);
    return !isInCheck(nb, p.color);
  });
}

function allLegalMoves(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.color === color)
        for (const [tr, tc] of legalMoves(board, r, c))
          moves.push({ fr: r, fc: c, tr, tc });
  return moves;
}

const PIECE_VALUE = { [PAWN]: 1, [KNIGHT]: 3, [BISHOP]: 3, [ROOK]: 5, [QUEEN]: 9, [KING]: 0 };

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const v = PIECE_VALUE[p.type] || 0;
      score += p.color === W ? v : -v;
    }
  return score;
}

function aiPickMove(board) {
  const moves = allLegalMoves(board, B);
  if (!moves.length) return null;
  let best = null, bestScore = Infinity;
  for (const m of moves) {
    const nb = applyMove(board, m.fr, m.fc, m.tr, m.tc);
    let score = evaluateBoard(nb);
    if (isInCheck(nb, W)) score -= 0.5;
    if (score < bestScore) { bestScore = score; best = m; }
  }
  return best;
}

export class ChessGame {
  constructor(canvas, ctx, setStatus) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.setStatus = setStatus;
    this.board = initialBoard();
    this.turn = W;
    this.selected = null;
    this.highlights = [];
    this.gameOver = false;
    this.autoRestart = false;
    this.aiThinking = false;

    this.handleClick = this.handleClick.bind(this);
    this.canvas.addEventListener("click", this.handleClick);

    this.setStatus("Chess: White's turn. Click a piece to select, then click to move.");
  }

  reset() {
    this.board = initialBoard();
    this.turn = W;
    this.selected = null;
    this.highlights = [];
    this.gameOver = false;
    this.aiThinking = false;
    this.setStatus("Chess: White's turn. Click a piece to select, then click to move.");
  }

  onKeyDown() {}
  onKeyUp() {}
  update() {}

  getCellFromPixel(px, py) {
    const w = this.canvas.width, h = this.canvas.height;
    const boardSize = Math.min(w, h) - 40;
    const cellSize = boardSize / 8;
    const ox = (w - boardSize) / 2, oy = (h - boardSize) / 2;
    const col = Math.floor((px - ox) / cellSize);
    const row = Math.floor((py - oy) / cellSize);
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return { row, col };
  }

  handleClick(e) {
    if (this.gameOver || this.aiThinking) return;
    if (this.turn !== W) return;

    const rect = this.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const cell = this.getCellFromPixel(px, py);
    if (!cell) return;

    const { row, col } = cell;

    if (this.selected) {
      const move = this.highlights.find((m) => m[0] === row && m[1] === col);
      if (move) {
        this.board = applyMove(this.board, this.selected.row, this.selected.col, row, col);
        this.selected = null;
        this.highlights = [];
        this.turn = B;
        this.checkEndCondition();
        if (!this.gameOver) {
          this.setStatus("Chess: Black is thinking...");
          this.aiThinking = true;
          setTimeout(() => this.doAiMove(), 350);
        }
        return;
      }
      this.selected = null;
      this.highlights = [];
    }

    const p = this.board[row][col];
    if (p && p.color === W) {
      const moves = legalMoves(this.board, row, col);
      if (moves.length) {
        this.selected = { row, col };
        this.highlights = moves;
      }
    }
  }

  doAiMove() {
    if (this.gameOver) return;
    const move = aiPickMove(this.board);
    if (!move) {
      this.checkEndCondition();
      this.aiThinking = false;
      return;
    }
    this.board = applyMove(this.board, move.fr, move.fc, move.tr, move.tc);
    this.turn = W;
    this.aiThinking = false;
    this.checkEndCondition();
    if (!this.gameOver) {
      this.setStatus("Chess: White's turn. Click a piece to select, then click to move.");
    }
  }

  checkEndCondition() {
    const currentMoves = allLegalMoves(this.board, this.turn);
    if (currentMoves.length === 0) {
      this.gameOver = true;
      if (isInCheck(this.board, this.turn)) {
        const winner = this.turn === W ? "Black" : "White";
        this.setStatus(`Chess: Checkmate! ${winner} wins. Press SPACE to restart.`);
      } else {
        this.setStatus("Chess: Stalemate! Draw. Press SPACE to restart.");
      }
      return;
    }
    if (isInCheck(this.board, this.turn)) {
      const who = this.turn === W ? "White" : "Black";
      this.setStatus(`Chess: ${who} is in check!`);
    }
  }

  onKeyDown(e) {
    if (this.gameOver && (e.code === "Space" || e.code === "Enter")) {
      this.reset();
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "#0f172a");
    gradient.addColorStop(1, "#020617");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const boardSize = Math.min(w, h) - 40;
    const cellSize = boardSize / 8;
    const ox = (w - boardSize) / 2, oy = (h - boardSize) / 2;

    const lightColor = "#e8d4b0";
    const darkColor = "#b58863";
    const selectColor = "rgba(56,189,248,0.55)";
    const moveColor = "rgba(34,197,94,0.45)";
    const captureColor = "rgba(239,68,68,0.45)";
    const checkColor = "rgba(239,68,68,0.6)";

    const kingInCheck = this.turn === W
      ? isInCheck(this.board, W) ? findKing(this.board, W) : null
      : isInCheck(this.board, B) ? findKing(this.board, B) : null;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = ox + c * cellSize;
        const y = oy + r * cellSize;
        ctx.fillStyle = (r + c) % 2 === 0 ? lightColor : darkColor;
        ctx.fillRect(x, y, cellSize, cellSize);

        if (kingInCheck && kingInCheck[0] === r && kingInCheck[1] === c) {
          ctx.fillStyle = checkColor;
          ctx.fillRect(x, y, cellSize, cellSize);
        }
      }
    }

    if (this.selected) {
      const sx = ox + this.selected.col * cellSize;
      const sy = oy + this.selected.row * cellSize;
      ctx.fillStyle = selectColor;
      ctx.fillRect(sx, sy, cellSize, cellSize);
    }

    for (const [mr, mc] of this.highlights) {
      const mx = ox + mc * cellSize;
      const my = oy + mr * cellSize;
      if (this.board[mr][mc]) {
        ctx.fillStyle = captureColor;
        ctx.fillRect(mx, my, cellSize, cellSize);
      } else {
        ctx.fillStyle = moveColor;
        ctx.beginPath();
        ctx.arc(mx + cellSize / 2, my + cellSize / 2, cellSize * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${cellSize * 0.72}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (!p) continue;
        const key = p.color + p.type;
        const ch = UNICODE[key];
        if (!ch) continue;
        const x = ox + c * cellSize + cellSize / 2;
        const y = oy + r * cellSize + cellSize / 2;
        ctx.fillStyle = p.color === W ? "#f8fafc" : "#1e293b";
        ctx.fillText(ch, x, y + 2);
      }
    }

    // Rank/file labels
    ctx.font = `${cellSize * 0.22}px system-ui, sans-serif`;
    ctx.fillStyle = "#94a3b8";
    for (let c = 0; c < 8; c++) {
      ctx.textAlign = "center";
      ctx.fillText("abcdefgh"[c], ox + c * cellSize + cellSize / 2, oy + boardSize + 14);
    }
    for (let r = 0; r < 8; r++) {
      ctx.textAlign = "right";
      ctx.fillText(String(8 - r), ox - 6, oy + r * cellSize + cellSize / 2);
    }
  }
}
