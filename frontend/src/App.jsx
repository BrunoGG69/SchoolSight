import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const WebcamUploader = () => {
  const webcamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  // Get available video input devices
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(mediaDevices => {
        const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId); // Default to first
        }
      });
  }, []);

  const captureAndUpload = async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return alert("Could not capture image.");

    setUploading(true);

    const blob = await fetch(imageSrc).then(res => res.blob());
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    const formData = new FormData();
    formData.append('file', blob);
    formData.append('upload_preset', 'unsigned'); // Remove if using signed upload
    formData.append('folder', 'captured_images');
    formData.append('public_id', `attendance_${timestamp}`);

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    try {
      const response = await axios.post(url, formData, {
        auth: {
          username: apiKey,
          password: apiSecret
        }
      });

      setImageUrl(response.data.secure_url);
      console.log("✅ Uploaded:", response.data.secure_url);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <label className="text-sm font-semibold">
        Select Camera:
        <select
          className="ml-2 border px-2 py-1 rounded"
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
        >
          {devices.map((device, idx) => (
            <option key={idx} value={device.deviceId}>
              {device.label || `Camera ${idx + 1}`}
            </option>
          ))}
        </select>
      </label>

      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
        }}
        className="rounded-md border shadow-md"
        width={400}
      />

      <button
        onClick={captureAndUpload}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Capture & Upload"}
      </button>

      {imageUrl && (
        <div className="mt-4">
          <p className="text-green-600">Image Uploaded:</p>
          <a href={imageUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">
            {imageUrl}
          </a>
        </div>
      )}
    </div>
  );
};

export default WebcamUploader;
