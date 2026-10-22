"use client";

export default function playConfetti() {
  // The script loads after the page, so it may not be ready on an early click
  (window.ConfettiPage as { play: () => void } | undefined)?.play();
}
