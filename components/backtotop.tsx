import React from "react";
import { Button } from "@mantine/core";

interface BackToTopButtonProps {
  className?: string;
}

const BackToTopButton: React.FC<BackToTopButtonProps> = ({ className }) => {
  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Button onClick={handleBackToTop} className={className}>
      Back to Top
    </Button>
  );
};

export default BackToTopButton;
