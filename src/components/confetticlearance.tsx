"use client";

import { useEffect } from "react";

let stopWatching: (() => void) | undefined;

// The third-party badge has no stable ID or class. Watch before requesting its
// script, and measure its final height rather than its entrance translation.
export function watchConfettiBadge() {
  if (stopWatching) return stopWatching;
  const root = document.documentElement;
  let badge: HTMLAnchorElement | undefined;
  let clearance = 0;
  let backBottom = 20;
  let focusFrame = 0;
  const keepFocusClear = () => {
    const target = document.activeElement;
    if (
      !clearance ||
      !badge?.isConnected ||
      !(target instanceof HTMLElement) ||
      target === badge ||
      target === document.body
    )
      return;
    const control = target.getBoundingClientRect();
    const credit = badge.getBoundingClientRect();
    if (
      control.right > credit.left &&
      control.left < credit.right &&
      control.bottom > window.innerHeight - clearance
    ) {
      target.scrollIntoView({ block: "center", inline: "nearest" });
    }
  };
  const focusChanged = () => {
    if (!badge) return;
    keepFocusClear();
    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => {
      keepFocusClear();
      focusFrame = requestAnimationFrame(keepFocusClear);
    });
  };
  const measure = () => {
    const style = badge && getComputedStyle(badge);
    const height = badge?.getBoundingClientRect().height ?? 0;
    const next =
      style?.position === "fixed" && height > 0
        ? Math.ceil(
            height + Math.max(0, Number.parseFloat(style.bottom) || 0) + 4,
          )
        : 0;
    if (next !== clearance) {
      clearance = next;
      root.style.setProperty("--confetti-clearance", `${String(next)}px`);
      root.toggleAttribute("data-confetti-badge", next > 0);
      keepFocusClear();
    }
    const back = document
      .querySelector("[data-back-to-top]")
      ?.getBoundingClientRect();
    const credit = badge?.getBoundingClientRect();
    const overlaps =
      back && credit && back.right > credit.left && back.left < credit.right;
    const bottom = overlaps ? Math.max(20, next) : 20;
    if (bottom !== backBottom) {
      backBottom = bottom;
      root.style.setProperty("--back-to-top-bottom", `${String(bottom)}px`);
    }
  };
  const resize = new ResizeObserver(measure);
  const attributes = new MutationObserver(measure);
  const findBadge = () => {
    if (badge?.isConnected) {
      measure();
      return;
    }
    resize.disconnect();
    attributes.disconnect();
    badge = [...document.querySelectorAll<HTMLAnchorElement>("a")].find(
      (anchor) =>
        anchor.querySelector("strong")?.textContent.trim() ===
          "ConfettiPage.com" && getComputedStyle(anchor).position === "fixed",
    );
    if (badge) {
      resize.observe(badge);
      attributes.observe(badge, {
        attributes: true,
        childList: true,
        subtree: true,
      });
    }
    measure();
  };
  const mutations = new MutationObserver((records) => {
    // Most game updates only change text or cards. Look for a new badge only
    // when an anchor could have been added, or the previous badge was removed.
    if (
      badge ||
      records.some((record) =>
        [...record.addedNodes].some(
          (node) =>
            node instanceof Element &&
            (node.matches("a, strong") || node.querySelector("a, strong")),
        ),
      )
    )
      findBadge();
  });
  mutations.observe(document.body, { childList: true, subtree: true });
  const resized = () => {
    measure();
    keepFocusClear();
  };
  window.addEventListener("resize", resized);
  document.addEventListener("focusin", focusChanged);
  findBadge();
  stopWatching = () => {
    mutations.disconnect();
    attributes.disconnect();
    resize.disconnect();
    window.removeEventListener("resize", resized);
    document.removeEventListener("focusin", focusChanged);
    cancelAnimationFrame(focusFrame);
    root.style.removeProperty("--confetti-clearance");
    root.style.removeProperty("--back-to-top-bottom");
    root.removeAttribute("data-confetti-badge");
    stopWatching = undefined;
  };
  return stopWatching;
}

export default function ConfettiClearance() {
  useEffect(() => watchConfettiBadge(), []);
  return null;
}
