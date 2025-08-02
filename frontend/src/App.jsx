import React, { useState, useRef } from "react";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore"; // Updated from addDoc to setDoc

function App() {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");
  const inputRef = useRef(null);

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatusMessage("Uploading image...");
    setStatusType("info");

    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = "captured_images";
      const publicId = `preprocessed_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;

      // Get signed upload signature from backend
      const sigRes = await fetch(
        `${import.meta.env.VITE_SIGNATURE_API}/sign-uploads?timestamp=${timestamp}&folder=${folder}&public_id=${publicId}`
      );
      const sigData = await sigRes.json();
      if (!sigRes.ok) throw new Error(sigData.error || "Failed to get signature");

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", import.meta.env.VITE_CLOUDINARY_API_KEY);
      formData.append("timestamp", sigData.timestamp);
      formData.append("signature", sigData.signature);
      formData.append("folder", folder);
      formData.append("public_id", publicId);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );
      const cloudData = await cloudRes.json();
      if (!cloudRes.ok) throw new Error(cloudData.error?.message || "Cloudinary upload failed");

      setStatusMessage("✅ Uploaded to Cloudinary.");
      setStatusType("success");

      // Write metadata to Firestore using publicId as the document ID
      await setDoc(doc(db, "uploads", publicId), {
        imageUrl: cloudData.secure_url,
        uploadedAt: new Date().toISOString(),
        folder: folder,
        status: "pending",
      });

      setStatusMessage("✅ Firestore updated successfully.");
      setStatusType("success");
    } catch (error) {
      console.error("Upload error:", error);
      setStatusMessage(`❌ Upload failed: ${error.message}`);
      setStatusType("error");
    }
  };

  const openCamera = () => {
    inputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-6 p-6">
      <h1 className="text-2xl font-bold text-gray-800">Smart Attendance Upload</h1>

      <button
        onClick={openCamera}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700"
      >
        Open Camera
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleImageChange}
      />

      {statusMessage && (
        <div
          className={`text-sm font-medium px-4 py-2 rounded-lg max-w-md text-center ${
            statusType === "success"
              ? "bg-green-100 text-green-800"
              : statusType === "error"
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
}

export default App;
