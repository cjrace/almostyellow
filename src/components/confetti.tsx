import React, { useEffect, useState } from "react";
import { Button } from "@mantine/core";

const Confetti: React.FC = () => {
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

  return <Button onClick={playConfetti}>Play confetti!</Button>;
};

export default Confetti;
