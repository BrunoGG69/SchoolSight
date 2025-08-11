import React, { useState, useRef } from "react";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import Blob from "./components/blobs.jsx";

function App() {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);
    setStatusMessage("Preview ready. Uploading...");
    setIsLoading(true);
    setStatusType("info");

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = "captured_images";
      const publicId = `preprocessed_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;

      const sigRes = await fetch(
        `${import.meta.env.VITE_SIGNATURE_API}/sign-uploads?timestamp=${timestamp}&folder=${folder}&public_id=${publicId}`
      );
      const sigData = await sigRes.json();
      if (!sigRes.ok) throw new Error(sigData.error || "Failed to get signature");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", import.meta.env.VITE_CLOUDINARY_API_KEY);
      formData.append("timestamp", sigData.timestamp);
      formData.append("signature", sigData.signature);
      formData.append("folder", folder);
      formData.append("public_id", publicId);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) throw new Error(cloudData.error?.message || "Cloudinary upload failed");

      setStatusMessage("Uploaded to Cloudinary.");
      setStatusType("success");

      await setDoc(doc(db, "uploads", publicId), {
        imageUrl: cloudData.secure_url,
        uploadedAt: new Date().toISOString(),
        folder: folder,
        status: "pending",
      });

      setStatusMessage("Firestore updated successfully.");
      setIsLoading(false);
    } catch (error) {
      console.error("Upload error:", error);
      setIsLoading(false);
      setStatusMessage(`Upload failed: ${error.message}`);
      setStatusType("error");
    }
  };

  const openCamera = () => {
    inputRef.current?.click();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleImageChange({ target: { files: [file] } });
    }
  };

  return (
      <div className="bg-black min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Blob container (transparent, blends blobs together) */}
        <div className="absolute inset-0 pointer-events-none -translate-y-32">
          {/* Desktop purple blobs */}
          <Blob
              color="bg-purple-800"
              size="w-[45rem] h-[45rem]"
              position="-top-[10%] -left-[10%]"
              delay="animation-delay-1000"
              style={{zIndex: 0}}
              className="hidden md:block"
          />
          <Blob
              color="bg-purple-500"
              size="w-[45rem] h-[45rem]"
              position="-top-[22%] -right-[13%]"
              delay="animation-delay-2500"
              style={{zIndex: 0}}
              className="hidden md:block"
          />

          {/* Mobile purple blob */}
          <Blob
              color="bg-purple-900"
              size="w-[20rem] h-[20rem]"
              position="absolute top-1/2 right-10 -translate-y-1/2"
              delay="animation-delay-1000"
              style={{zIndex: 0}}
              className="block md:hidden"
          />

          {/* Desktop blue blobs */}
          <Blob
              color="bg-indigo-400"
              size="w-[30rem] h-[30rem]"
              position="top-[10%] left-[22%]"
              delay="animation-delay-1200"
              style={{zIndex: 1}}
              className="hidden md:block"
          />
          <Blob
              color="bg-blue-400"
              size="w-[30rem] h-[30rem]"
              position="top-[6%] right-[28%]"
              delay="animation-delay-2200"
              style={{zIndex: 1}}
              className="hidden md:block"
          />
          <Blob
              color="bg-blue-400"
              size="w-[30rem] h-[30rem]"
              position="top-[33%] right-[12%]"
              delay="animation-delay-1800"
              style={{zIndex: 4}}
              className="hidden md:block"
          />

          {/* Mobile blue blobs (clustered top-right) */}
          <div className="block md:hidden absolute top-6 right-4 flex flex-col gap-6 z-10">
            <Blob
                color="bg-yellow-400"
                size="w-[12rem] h-[12rem]"
                position="relative"
                delay="animation-delay-1200"
                style={{zIndex: 1}}
            />
            <Blob
                color="bg-yellow-400"
                size="w-[12rem] h-[12rem]"
                position="relative -top-3"
                delay="animation-delay-2200"
                style={{zIndex: 1}}
            />
          </div>

          {/* Desktop yellow & red blobs */}
          <div className="absolute inset-0 flex items-center justify-center gap-20 z-10 md:flex">
            <Blob
                color="bg-yellow-400"
                size="w-[36rem] h-[36rem]"
                position="absolute top-[28%] right-[30%] -translate-x-1/2 -translate-y-1/2"
                delay="animation-delay-1700"
                style={{zIndex: 3}}
                className="hidden md:block"
            />
            <Blob
                color="bg-red-500"
                size="w-[34rem] h-[34rem]"
                position="absolute top-[28%] right-[53%] -translate-x-1/2 -translate-y-1/2"
                delay="animation-delay-900"
                style={{zIndex: 5}}
                className="hidden md:block"
            />
          </div>

          {/* Mobile blobs */}
          <Blob
              color="bg-red-500"
              size="w-[25rem] h-[25rem]"
              position="absolute top-4 left-4"
              delay="animation-delay-1700"
              style={{zIndex: 5}}
              className="block md:hidden"
          />
          <Blob
              color="bg-indigo-500"
              size="w-[25rem] h-[25rem]"
              position="absolute -bottom-1 -right-1"
              delay="animation-delay-900"
              style={{zIndex: 5}}
              className="block md:hidden"
          />
        </div>

        {/* Blur overlay */}
        <div className="absolute inset-0 backdrop-blur-4xl"></div>

        {/* Centered Upload Box */}
<div
  className={`
    relative z-20 bg-black bg-opacity-70 border rounded-2xl
    p-6 px-6 sm:px-8
    max-w-xs sm:max-w-md w-full
    shadow-xl
    hover:bg-opacity-85
    transition duration-300 ease-in-out
    cursor-pointer
    mx-4 my-8
    ${isDragging ? "border-[#00D4FF] border-2 border-dashed" : "border-gray-600"}
  `}
  onClick={() => document.getElementById("fileInput").click()}
  aria-label="Upload Image"
  onDragOver={(e) => {
    e.preventDefault();
    setIsDragging(true);
  }}
  onDragLeave={() => setIsDragging(false)}
  onDrop={handleDrop}
>
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
            {/* Camera Icon & Header */}
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
              <p className="text-sm text-gray-300">Click to capture or drag & drop an image here</p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
              <button
                  onClick={openCamera}
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
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
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

            {/* Hidden File Input */}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageChange}
            />

            {/* Image Preview */}
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

          {/* Toast Popup */}
          {statusMessage && (
              <div
                  className={`fixed z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 flex items-center gap-3
            bg-opacity-90
            ${
                      statusType === "success"
                          ? "bg-green-600 text-white"
                          : statusType === "error"
                              ? "bg-red-600 text-white"
                              : "bg-yellow-500 text-black"
                  }
            top-4 left-1/2 -translate-x-1/2
            sm:top-auto sm:bottom-6 sm:left-6 sm:translate-x-0
          `}
              >
                {/* SVG Icon */}
                {statusType === "success" && (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M9 12l2 2l4 -4M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10s-4.48 10 -10 10z"/>
                    </svg>
                )}
                {statusType === "error" && (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M12 9v2m0 4h.01M12 2a10 10 0 110 20a10 10 0 010-20zm0 0v4m0 8v4"/>
                    </svg>
                )}
                {statusType === "info" && (
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" strokeWidth="2"
                         viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20a10 10 0 010-20z"/>
                    </svg>
                )}

                <span>{statusMessage}</span>
              </div>
          )}
        </div>
        </div>
        );
        }

        export default App;
