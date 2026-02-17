import { GameManager } from "./gameManager.mjs";

const canvas = document.getElementById("gameCanvas");
const menu = document.getElementById("menu");
const backButton = document.getElementById("backButton");
const statusEl = document.getElementById("status");

const manager = new GameManager(canvas, statusEl);
manager.attach();

function showMenu() {
  menu.style.display = "flex";
  canvas.style.visibility = "hidden";
  backButton.style.visibility = "hidden";
  manager.stopGame();
}

function startGame(gameId) {
  menu.style.display = "none";
  canvas.style.visibility = "visible";
  backButton.style.visibility = "visible";
  manager.startGame(gameId);
}

menu.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-game]");
  if (!btn) return;
  const id = btn.getAttribute("data-game");
  startGame(id);
});

backButton.addEventListener("click", () => {
  showMenu();
});

// Initial state
showMenu();

