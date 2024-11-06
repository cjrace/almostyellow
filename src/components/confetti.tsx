"use client";

import { useEffect, useState } from "react";
import { Button, Group } from "@mantine/core";
import Script from "next/script";

// Make the props optional with a default value
interface ConfettiProps {
  buttonText?: string;
  size?: string;
}

export default function Confetti({
  buttonText = "Play confetti!",
  size = "xl",
}: ConfettiProps) {
  const [confettiInitialized, setConfettiInitialized] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://run.confettipage.com/here.js";
    script.async = true;
    script.onload = () => {
      setConfettiInitialized(true);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const playConfetti = () => {
    if (confettiInitialized) {
      window.ConfettiPage.play();
    }
  };

  return (
    <Group justify="center">
      <Script
        async
        data-trigger="custom"
        src="https://run.confettipage.com/here.js"
        data-confetticode="U2FsdGVkX1+CNcJBzcKLJOKIu6YhgT7XjghTb+IWZHSoogELCwoPC/PUZQIW5u3G1VPa5AP+lxJTvkyENTZzRSJPTJJjB+0knZVwSPBUprdUZugMFu7o+b3Qvrt+TXJfl4nEnE86Hd2i4D/bFcHE8GHx/ZETOTUJKXBV88gGyUzWrijXvtrbArWtm1at4XdI/peCfOf+3SdC05Esnhb9gC1UVA74FF4Yjn6mHdEFuEGstzuTibqvVRG3n0J9cbj6/euOgd0566CT59EhfLGcBudSqal7p2d4Dwgt3tOU6KLv/+sBWg0gwc8dDl+2nTTmJoE6U/sL/3Qn1EmiHOvQ1dY1dhHItHHcizSsG6+IRX0SRvZ6X6e9qonsFF9IMWmeMDrtEG9tUwV0//GsBuqp13oNETU36j6ep7ZiK+9M6uJfQqsZegVdvzpPyllQ+5wwWDenjR27jowVP1pWGgHcK5O99xHBYGoqm+xWiX0LaXZ9fhmrGbYw0kVS2SpbvyjBDn3MKxc5N/p5B7Jv2lx9B94xVsiAU0P3GXCxqoFncFDI63txMjvQ9+2uFEApqXuyS2UYDH1ltKAbubpcia/A7Z3wos5QoomZjI8GK3YCrvBjHRV7/Q6cL0CqBMoeOPaMIWNH83nEOYEz1c8pPCF7Oii/Dn8+4yTebsWPpS4YAlSA7pcneoaEhntjFJm8IjHV"
      ></Script>

      <Button onClick={playConfetti} m="lg" size={size}>
        {buttonText}
      </Button>
    </Group>
  );
}
