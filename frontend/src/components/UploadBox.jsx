import React from "react";
import { handleImageChangeHelper } from "../utils/handleImageChange.js";

function UploadBox({
  statusMessage,
  setStatusMessage,
  statusType,
  setStatusType,
  previewUrl,
  setPreviewUrl,
  isDragging,
  setIsDragging,
  inputRef,
  isLoading,
  setIsLoading
}) {
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleImageChangeHelper(
        { target: { files: [file] } },
        setPreviewUrl,
        setStatusMessage,
        setStatusType,
        setIsLoading
      );
    }
  };

  return (
      <div
          className={`
    relative z-20 bg-black/70 border rounded-2xl
    p-6 px-6 sm:px-8 max-w-xs sm:max-w-md w-full shadow-2xl
    hover:bg-black/85 transition duration-300 ease-in-out
    cursor-context-menu mx-4 my-8
    ${isDragging ? "border-[#00D4FF] border-2 border-dashed" : "border-gray-600"}
  `}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
      >
        {/* Single input for all uploads */}
        <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) =>
                handleImageChangeHelper(
                    e,
                    setPreviewUrl,
                    setStatusMessage,
                    setStatusType,
                    setIsLoading
                )
            }
        />

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="bg-purple-500/20 p-4 rounded-full">
            <svg
                className="w-10 h-10 text-[#00D4FF]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
            >
              <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z"
              />
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-white">Upload Your Photo</h2>
          <p className="text-sm text-gray-300">
            Click to capture or drag & drop an image here
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
            <button
                onClick={() => inputRef.current?.click()}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-[#00D4FF] hover:bg-[#00D4FF]/30 text-white font-medium px-6 py-3 rounded-3xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >

              {isLoading && (
                  <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                  >
                    <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                    />
                    <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
              )}
              {isLoading ? "Uploading..." : "Capture Image"}
            </button>
            <p className="text-sm text-[#00D4FF] italic hover:underline hover:text-[#00D4FF]/30 transition-all duration-200 text-center">
              or drag and drop
            </p>
          </div>

          {previewUrl && (
              <div className="w-full border border-dashed border-[#00D4FF] rounded-xl p-3 bg-white/5">
                <img
                    src={previewUrl}
                    alt="Preview"
                    className="rounded-xl w-full max-h-80 object-cover shadow-md border border-white/10"
                />
              </div>
          )}
        </div>

        {statusMessage && (
            <div
                className={`fixed z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 flex items-center gap-3 bg-opacity-90
            ${statusType === "success"
                    ? "bg-green-600 text-white"
                    : statusType === "error"
                        ? "bg-red-600 text-white"
                        : "bg-yellow-500 text-black"}
            top-4 left-1/2 -translate-x-1/2 sm:top-auto sm:bottom-6 sm:left-6 sm:translate-x-0`}
            >
              {statusType === "success" && (
                  <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                  >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2l4 -4M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10s-4.48 10 -10 10z"
                    />
                  </svg>
              )}
              {statusType === "error" && (
                  <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                  >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01M12 2a10 10 0 110 20a10 10 0 010-20zm0 0v4m0 8v4"
                    />
                  </svg>
              )}
              {statusType === "info" && (
                  <svg
                      className="w-5 h-5 text-black"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                  >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20a10 10 0 010-20z"
                    />
                  </svg>
              )}
              <span>{statusMessage}</span>
            </div>
        )}
      </div>
  );
}

export default UploadBox;
