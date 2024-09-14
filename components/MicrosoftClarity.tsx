import Script from 'next/script';

const MicrosoftClarity = () => {
  const trackingCode = process.env.NEXT_PUBLIC_MICROSOFT_CLARITY;

  return (
    <Script
      id="microsoft-clarity-init"
      strategy="afterInteractive"
      src={`https://www.clarity.ms/tag/${trackingCode}`}
    />
  );
};

export default MicrosoftClarity;
