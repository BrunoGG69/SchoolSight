import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';

const WebcamUploader = () => {
  const webcamRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState('');

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Get available cameras
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices()
      .then(mediaDevices => {
        const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId); // Default to first
        }
      }).catch(err => {
        console.error("Error getting cameras:", err);
        setError("Camera access denied or not supported.");
      });
  }, []);

  const captureAndUpload = async () => {
    setError('');
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return setError("Could not capture image.");

    setUploading(true);

    try {
      const blob = await fetch(imageSrc).then(res => res.blob());
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', 'captured_images');
      formData.append('public_id', `attendance_${timestamp}`);

      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

      const response = await axios.post(url, formData);
      setImageUrl(response.data.secure_url);
      console.log("✅ Uploaded:", response.data.secure_url);
    } catch (error) {
      console.error("❌ Upload failed:", error.response?.data || error.message);
      setError("Upload failed: " + (error.response?.data?.error?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen bg-black text-white">
      <h1 className="text-2xl font-semibold">📷 Smart Camera</h1>

      <label className="text-sm">
        Select Camera:
        <select
          className="ml-2 border px-2 py-1 rounded text-black"
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
        >
          {devices.map((device, idx) => (
            <option key={device.deviceId} value={device.deviceId}>
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
        className="px-6 py-2 mt-4 bg-green-600 text-white rounded hover:bg-green-700"
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "📤 Capture & Upload"}
      </button>

      {imageUrl && (
        <div className="mt-4 text-center">
          <p className="text-green-400 font-medium">✅ Uploaded Successfully:</p>
          <a href={imageUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline break-all">
            {imageUrl}
          </a>
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-400">
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default WebcamUploader;
