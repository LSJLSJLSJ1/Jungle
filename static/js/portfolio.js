const introOverlay = document.querySelector("#cutscene-overlay");
const portfolioContent = document.querySelector("#portfolio-content");
if (introOverlay && window.THREE && window.jQuery && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !location.hash) {
  introOverlay.hidden = false;
  portfolioContent.inert = true;
  document.body.classList.add("intro-active");
  document.querySelector("#btn-drop").focus({preventScroll:true});
  const finishIntro = () => {
    portfolioContent.inert = false;
    document.body.classList.remove("intro-active");
    document.querySelector("#intro-title").focus({preventScroll:true});
  };
  const observer = new MutationObserver(() => {
    if (introOverlay.style.display === "none") { finishIntro(); observer.disconnect(); }
  });
  observer.observe(introOverlay, {attributes:true, attributeFilter:["style"]});
  document.addEventListener("keydown", event => {
    if (!document.body.classList.contains("intro-active")) return;
    if (event.key === "Escape") { event.preventDefault(); window.skipCutscene(); }
    if (event.key === "Tab") {
      const buttons = [...introOverlay.querySelectorAll("button")].filter(b => !b.disabled && b.getClientRects().length);
      const index = buttons.indexOf(document.activeElement);
      const next = buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length];
      if (next) { event.preventDefault(); next.focus(); }
    }
  });
}
