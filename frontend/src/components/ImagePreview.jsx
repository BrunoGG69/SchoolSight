import React from "react";

export default function ImagePreview({ previewUrl }) {
  if (!previewUrl) return null;

  return (
    <div className="w-full border border-dashed border-[#00D4FF] rounded-xl p-3 bg-white/5">
      <img
        src={previewUrl}
        alt="Preview"
        className="rounded-xl w-full max-h-80 object-cover shadow-md border border-white/10"
      />
    </div>
  );
}
