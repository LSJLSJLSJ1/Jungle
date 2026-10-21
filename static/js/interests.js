const animatedImage = document.querySelector("#rl-animation");
const stillFrame = document.querySelector("#rl-still");
if (animatedImage && stillFrame) {
  // Reduced motion shows the first frame instead of the looping clip.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const updateFrame = () => {
    const still = reducedMotion.matches;
    if (still) {
      stillFrame.getContext("2d").drawImage(animatedImage, 0, 0, stillFrame.width, stillFrame.height);
    }
    animatedImage.hidden = still;
    stillFrame.hidden = !still;
  };
  if (reducedMotion.matches) animatedImage.loading = "eager";
  if (animatedImage.complete && animatedImage.naturalWidth) updateFrame();
  else animatedImage.addEventListener("load", updateFrame, {once:true});
  reducedMotion.addEventListener("change", () => { if (animatedImage.complete) updateFrame(); });
}
