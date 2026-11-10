// Header: mark the section being read.
const navLinks = [...document.querySelectorAll(".site-header nav a[href^='#']")];
const navTargets = navLinks.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
const markCurrent = () => {
  const line = window.innerHeight * 0.35;
  let current = navTargets[0];
  for (const target of navTargets) if (target.getBoundingClientRect().top <= line) current = target;
  for (const link of navLinks) {
    if (link.getAttribute("href") === `#${current.id}`) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  }
};

// Type moment: the statement lights up word by word while it crosses the screen.
// Without script, or with reduced motion, the text is simply fully lit.
const statement = document.querySelector("[data-light]");
let words = [];
if (statement && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  for (const paragraph of statement.querySelectorAll("p")) {
    const parts = paragraph.textContent.trim().split(/\s+/);
    paragraph.setAttribute("aria-label", paragraph.textContent.trim());
    paragraph.textContent = "";
    parts.forEach((part, index) => {
      const span = document.createElement("span");
      span.className = "w";
      span.setAttribute("aria-hidden", "true");
      span.textContent = part;
      paragraph.append(span, index < parts.length - 1 ? " " : "");
    });
  }
  words = [...statement.querySelectorAll(".w")];
}
const lightWords = () => {
  if (!words.length) return;
  const box = statement.getBoundingClientRect();
  // 0 when the block's top reaches 85% of the screen, 1 when its bottom reaches 55%.
  const start = window.innerHeight * 0.85;
  const end = window.innerHeight * 0.55;
  const progress = Math.min(1, Math.max(0, (start - box.top) / (start - end + box.height)));
  const lit = Math.round(progress * words.length);
  words.forEach((word, index) => word.classList.toggle("is-lit", index < lit));
};

let queued = false;
const onScroll = () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; markCurrent(); lightWords(); });
};
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();
