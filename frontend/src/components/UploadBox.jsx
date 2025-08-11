import React from "react";
import ImagePreview from "./ImagePreview";

export default function UploadBox({
  isDragging,
  setIsDragging,
  handleDrop,
  inputRef,
  handleImageChange,
  openCamera,
  isLoading,
  previewUrl
}) {
  return (
    <div
      className={`relative z-20 bg-black bg-opacity-70 border rounded-2xl
        p-6 px-6 sm:px-8 max-w-xs sm:max-w-md w-full shadow-xl hover:bg-opacity-85
        transition duration-300 ease-in-out cursor-pointer mx-4 my-8
        ${isDragging ? "border-[#00D4FF] border-2 border-dashed" : "border-gray-600"}`}
      onClick={() => document.getElementById("fileInput").click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Hidden File Input */}
      <input
        id="fileInput"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files.length) {
            alert(`Selected file: ${e.target.files[0].name}`);
          }
        }}
      />

      {/* Camera Icon */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-purple-500/20 p-4 rounded-full">
          <svg className="w-10 h-10 text-[#00D4FF]" fill="none" stroke="currentColor" strokeWidth="2"
               viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white">Upload Your Photo</h2>
        <p className="text-sm text-gray-300">Click to capture or drag & drop an image here</p>

        {/* Button */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <button
            onClick={openCamera}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-[#00D4FF] hover:bg-[#00D4FF]/30 text-white font-medium px-6 py-3 rounded-3xl shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {isLoading && (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg"
                   fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
              </svg>
            )}
            {isLoading ? "Uploading..." : "Capture Image"}
          </button>
          <p className="text-sm text-[#00D4FF] italic hover:underline hover:text-[#00D4FF]/30 transition-all duration-200 text-center">
            or drag and drop
          </p>
        </div>

        {/* File Input for Camera */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageChange}
        />

        <ImagePreview previewUrl={previewUrl} />
      </div>
    </div>
  );
}
