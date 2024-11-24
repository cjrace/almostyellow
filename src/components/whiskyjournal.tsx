"use client";

import { whiskyData, WhiskyCard } from "@/components/whiskycard";

export default function WhiskyJournal() {
  return (
    <>
      {whiskyData.map((whisky) => (
        <div key={whisky.whisky_id}>
          <WhiskyCard {...whisky} />
        </div>
      ))}
    </>
  );
}
