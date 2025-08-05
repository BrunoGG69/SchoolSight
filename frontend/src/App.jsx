import React, { useState, useRef } from "react";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

function App() {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const tempUrl = URL.createObjectURL(file);
    setPreviewUrl(tempUrl);
    setStatusMessage("Preview ready. Uploading...");
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

      setStatusMessage("✅ Uploaded to Cloudinary.");
      setStatusType("success");

      await setDoc(doc(db, "uploads", publicId), {
        imageUrl: cloudData.secure_url,
        uploadedAt: new Date().toISOString(),
        folder: folder,
        status: "pending",
      });

      setStatusMessage("✅ Firestore updated successfully.");
    } catch (error) {
      console.error("Upload error:", error);
      setStatusMessage(`❌ Upload failed: ${error.message}`);
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

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
  <div className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-black via-[#1a1a2e] to-[#3f0071]">
    {/* Upload Box with Drag-and-Drop */}
    <div
      className="w-full max-w-2xl p-10 rounded-3xl bg-black/40 backdrop-blur-md border border-dashed border-purple-500/50 shadow-xl flex flex-col items-center gap-6 transition-all duration-300"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Camera Icon */}
      <div className="flex flex-col items-center gap-3">
        <div className="bg-purple-500/20 p-4 rounded-full">
          <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-white">Upload Your Photo</h2>
        <p className="text-sm text-gray-300 text-center">Click to capture or drag & drop a photo anywhere in this box</p>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={openCamera}
          className="bg-purple-500 hover:bg-purple-600 text-white font-medium px-6 py-3 rounded-3xl shadow-lg transition-all duration-300"
        >
          Capture Image
        </button>
        {/* Upload Icon Button */}
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 text-white hover:text-purple-400 transition-all"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5 5 5M12 15V3" />
          </svg>
          <span>Upload</span>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageChange}
      />

      {/* Image Preview inside dashed area */}
      {previewUrl && (
        <div className="w-full border border-dashed border-purple-300 rounded-xl p-4 bg-white/5">
          <img
            src={previewUrl}
            alt="Preview"
            className="rounded-xl w-full object-cover max-h-80 shadow-md border border-white/10"
          />
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`text-sm font-medium px-4 py-2 rounded-lg text-center w-full transition-all ${
            statusType === "success"
              ? "bg-green-500/20 text-green-300 border border-green-400/30"
              : statusType === "error"
              ? "bg-red-500/20 text-red-300 border border-red-400/30"
              : "bg-yellow-500/20 text-yellow-200 border border-yellow-400/30"
          }`}
        >
          {statusMessage}
        </div>
      )}
    </div>
  </div>
);

}

export default App;
