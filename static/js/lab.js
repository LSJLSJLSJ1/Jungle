document.addEventListener("DOMContentLoaded", () => {
  window.initPacmanGame?.("pacman-canvas");
  document
    .querySelector("#btn-ai-toggle")
    ?.addEventListener("click", () => window.toggleAIVisualization?.());
  document
    .querySelector("#pacman-reset")
    ?.addEventListener("click", () => window.resetPacmanGame?.());
  document
    .querySelector("#pacman-pause")
    ?.addEventListener("click", () => window.togglePacmanPause?.());
});
