const offlineReturn = document.querySelector("#lobby-return-button");
if (offlineReturn) {
  offlineReturn.textContent = "포트폴리오로";
  offlineReturn.addEventListener(
    "click",
    (event) => {
      event.stopImmediatePropagation();
      location.href = "../../../index.html#visual-shooting-code";
    },
    { capture: true },
  );
}
