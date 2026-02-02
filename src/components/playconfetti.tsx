"use client";

export default function playConfetti() {
  (window.ConfettiPage as { play: () => void }).play();
}
