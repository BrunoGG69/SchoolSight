import React from "react";

export default function Toast({ statusMessage, statusType }) {
  if (!statusMessage) return null;

  const icons = {
    success: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"
           viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 12l2 2l4 -4M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10s-4.48 10 -10 10z"/>
      </svg>
    ),
    error: (
      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"
           viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v2m0 4h.01M12 2a10 10 0 110 20a10 10 0 010-20zm0 0v4m0 8v4"/>
      </svg>
    ),
    info: (
      <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2"
           viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20a10 10 0 010-20z"/>
      </svg>
    ),
  };

  return (
    <div
      className={`fixed z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 flex items-center gap-3
        bg-opacity-90
        ${statusType === "success"
          ? "bg-green-600 text-white"
          : statusType === "error"
            ? "bg-red-600 text-white"
            : "bg-yellow-500 text-black"
        }
        top-4 left-1/2 -translate-x-1/2
        sm:top-auto sm:bottom-6 sm:left-6 sm:translate-x-0`}
    >
      {icons[statusType]}
      <span>{statusMessage}</span>
    </div>
  );
}
