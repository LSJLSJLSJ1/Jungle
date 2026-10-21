const copyButton = document.querySelector("#copy-link");
const copyStatus = document.querySelector("#copy-status");
copyButton?.addEventListener("click", async () => {
  const url = new URL(location.href);
  url.hash = "";
  url.search = "";
  copyButton.disabled = true;
  try {
    if (!navigator.clipboard) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(url.href);
    copyStatus.textContent = "링크를 복사했습니다.";
  } catch {
    copyStatus.textContent = `주소창의 링크를 복사해 주세요: ${url.href}`;
  } finally {
    copyButton.disabled = false;
  }
});


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
