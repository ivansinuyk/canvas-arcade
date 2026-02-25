import { DoodleJumpGame } from "./games/doodleJump.mjs";
import { FlappyBirdGame } from "./games/flappyBird.mjs";
import { RacerGame } from "./games/racer.mjs";
import { SnakeGame } from "./games/snake.mjs";
import { SudokuGame } from "./games/sudoku.mjs";
import { RaycasterGame } from "./games/raycaster.mjs";
import { Doom3DGame } from "./games/doom3d.mjs";
import { ChessGame } from "./games/chess.mjs";
import { BreakoutGame } from "./games/breakout.mjs";
import { AngryBirdGame } from "./games/angryBird.mjs";
import { TetrisGame } from "./games/tetris.mjs";
import { MarioGame } from "./games/mario.mjs";

export class GameManager {
  constructor(canvas, statusEl) {
    this.canvas = canvas;
    this.ctx = null;
    this.statusEl = statusEl;

    this.currentGame = null;
    this.lastTimestamp = 0;
    this.running = false;

    this.keyState = new Set();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.loop = this.loop.bind(this);
  }

  attach() {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousemove", this.handleMouseMove);
    window.addEventListener("mousedown", this.handleMouseDown);
  }

  detach() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("mousedown", this.handleMouseDown);
  }

  handleKeyDown(e) {
    this.keyState.add(e.code);
    if (this.currentGame?.onKeyDown) {
      this.currentGame.onKeyDown(e);
    }
  }

  handleKeyUp(e) {
    this.keyState.delete(e.code);
    if (this.currentGame?.onKeyUp) {
      this.currentGame.onKeyUp(e);
    }
  }

  handleMouseMove(e) {
    if (this.currentGame?.onMouseMove) {
      this.currentGame.onMouseMove(e);
    }
  }

  handleMouseDown(e) {
    if (this.currentGame?.onMouseDown) {
      this.currentGame.onMouseDown(e);
    }
  }

  setStatus(text) {
    if (this.statusEl) {
      this.statusEl.textContent = text;
    }
  }

  startGame(id) {
    switch (id) {
      case "doodle":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new DoodleJumpGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "flappy":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new FlappyBirdGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "racer":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new RacerGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "snake":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new SnakeGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "sudoku":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new SudokuGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "raycaster":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new RaycasterGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "doom3d":
        this.ctx = null;
        this.currentGame = new Doom3DGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "chess":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new ChessGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "breakout":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new BreakoutGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "angrybird":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new AngryBirdGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "tetris":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new TetrisGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      case "mario":
        this.ctx = this.canvas.getContext("2d");
        this.currentGame = new MarioGame(
          this.canvas,
          this.ctx,
          this.setStatus.bind(this)
        );
        break;
      default:
        throw new Error(`Unknown game id: ${id}`);
    }

    this.currentGame.reset();
    this.running = true;
    this.lastTimestamp = performance.now();
    requestAnimationFrame(this.loop);
  }

  stopGame() {
    this.running = false;
    if (this.currentGame?.cleanup) this.currentGame.cleanup();
    this.currentGame = null;
    this.clear();
    this.setStatus("");
  }

  clear() {
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  loop(timestamp) {
    if (!this.running || !this.currentGame) return;

    const dt = Math.min((timestamp - this.lastTimestamp) / 1000, 0.033);
    this.lastTimestamp = timestamp;

    this.currentGame.update(dt, this.keyState);
    this.currentGame.draw();

    if (this.currentGame.gameOver && this.currentGame.autoRestart) {
      this.currentGame.reset();
    }

    requestAnimationFrame(this.loop);
  }
}

