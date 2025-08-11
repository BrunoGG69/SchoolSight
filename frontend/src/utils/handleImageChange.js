import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export async function handleImageChangeHelper(
  event,
  setPreviewUrl,
  setStatusMessage,
  setStatusType,
  setIsLoading
) {
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
}
