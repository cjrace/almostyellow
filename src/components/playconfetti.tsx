"use client";

// Our confetti design on confettipage.com
const CONFETTI_CODE =
  "U2FsdGVkX1+CNcJBzcKLJOKIu6YhgT7XjghTb+IWZHSoogELCwoPC/PUZQIW5u3G1VPa5AP+lxJTvkyENTZzRSJPTJJjB+0knZVwSPBUprdUZugMFu7o+b3Qvrt+TXJfl4nEnE86Hd2i4D/bFcHE8GHx/ZETOTUJKXBV88gGyUzWrijXvtrbArWtm1at4XdI/peCfOf+3SdC05Esnhb9gC1UVA74FF4Yjn6mHdEFuEGstzuTibqvVRG3n0J9cbj6/euOgd0566CT59EhfLGcBudSqal7p2d4Dwgt3tOU6KLv/+sBWg0gwc8dDl+2nTTmJoE6U/sL/3Qn1EmiHOvQ1dY1dhHItHHcizSsG6+IRX0SRvZ6X6e9qonsFF9IMWmeMDrtEG9tUwV0//GsBuqp13oNETU36j6ep7ZiK+9M6uJfQqsZegVdvzpPyllQ+5wwWDenjR27jowVP1pWGgHcK5O99xHBYGoqm+xWiX0LaXZ9fhmrGbYw0kVS2SpbvyjBDn3MKxc5N/p5B7Jv2lx9B94xVsiAU0P3GXCxqoFncFDI63txMjvQ9+2uFEApqXuyS2UYDH1ltKAbubpcia/A7Z3wos5QoomZjI8GK3YCrvBjHRV7/Q6cL0CqBMoeOPaMIWNH83nEOYEz1c8pPCF7Oii/Dn8+4yTebsWPpS4YAlSA7pcneoaEhntjFJm8IjHV";

let loading: Promise<void> | null = null;

// The script is large, so it is only fetched the first time someone asks for
// confetti rather than on every page
function loadConfetti() {
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://run.confettipage.com/here.js";
    script.async = true;
    script.dataset.trigger = "custom";
    script.dataset.confetticode = CONFETTI_CODE;
    script.onload = () => {
      resolve();
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("Could not load the confetti"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

// The script sets itself up after it loads, so wait a moment for it
async function confettiPage() {
  await loadConfetti();
  for (let tries = 0; tries < 50; tries++) {
    const page = window.ConfettiPage as { play: () => void } | undefined;
    if (page) return page;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return undefined;
}

export default function playConfetti() {
  // Confetti is only decoration, so skip it for anyone who has asked for less
  // motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  confettiPage()
    .then((page) => page?.play())
    .catch(() => undefined);
}
