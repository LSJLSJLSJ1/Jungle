const animatedImage = document.querySelector("#rl-animation");
const stillFrame = document.querySelector("#rl-still");
const toggleAnimation = document.querySelector("#rl-toggle");
if (animatedImage && stillFrame && toggleAnimation) {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reducedMotion.matches;
  const updateFrame = () => {
    if (paused) {
      stillFrame.getContext("2d").drawImage(animatedImage, 0, 0, stillFrame.width, stillFrame.height);
    }
    animatedImage.hidden = paused;
    stillFrame.hidden = !paused;
    toggleAnimation.textContent = paused ? "재생" : "일시정지";
    toggleAnimation.setAttribute("aria-pressed", String(paused));
  };
  const ready = () => {
    updateFrame();
    toggleAnimation.hidden = false;
  };
  if (paused) animatedImage.loading = "eager";
  if (animatedImage.complete && animatedImage.naturalWidth) ready();
  else animatedImage.addEventListener("load", ready, {once:true});
  toggleAnimation.addEventListener("click", () => { paused = !paused; updateFrame(); });
  reducedMotion.addEventListener("change", event => { paused = event.matches; if (animatedImage.complete) updateFrame(); });
}
