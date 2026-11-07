// A short buzz on phones. Android browsers support navigator.vibrate. iPhones
// don't, but Safari ticks when a switch control is toggled during a tap, so a
// hidden one stands in. It is a side effect rather than a feature, and only
// works while the page is reacting to a touch.
function iPhoneTick() {
  const tap = document.createElement("label");
  tap.setAttribute("aria-hidden", "true");
  tap.style.cssText =
    "position:fixed;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.tabIndex = -1;
  tap.append(input);
  document.body.append(tap);
  tap.click();
  tap.remove();
}

export function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
    return;
  }
  // One tick at the start of each buzz in the pattern
  const steps = typeof pattern === "number" ? [pattern] : pattern;
  let time = 0;
  steps.forEach((length, index) => {
    if (index % 2 === 0) window.setTimeout(iPhoneTick, time);
    time += length;
  });
}
