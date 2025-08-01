import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

function App() {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // 🔧 Replace this with your actual Vercel domain:
  const SIGNATURE_ENDPOINT = 'https://upload.brunogg.in/api/sign-uploads';

  useEffect(() => {
    const getCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      } catch (err) {
        setCameraError('Unable to access camera. Please allow permission.');
      }
    };
    getCamera();

    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const captureImage = () => {
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataURL = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataURL);
  };

  const uploadToCloudinary = async () => {
    if (!capturedImage) return;

    setUploading(true);
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'captured_images';

    try {
      // 🔐 Step 1: Get Signature
      const sigRes = await axios.get(`${SIGNATURE_ENDPOINT}?timestamp=${timestamp}&folder=${folder}`);
      const { signature } = sigRes.data;

      // 📤 Step 2: Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', capturedImage);
      formData.append('api_key', import.meta.env.VITE_CLOUDINARY_API_KEY);
      formData.append('timestamp', timestamp);
      formData.append('folder', folder);
      formData.append('signature', signature);

      const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

      const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        formData
      );

      console.log('✅ Uploaded:', uploadRes.data.secure_url);
      alert('Upload successful!');
    } catch (error) {
      console.error('❌ Upload failed:', error);
      alert('Upload failed!');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl mb-4 font-bold">Webcam Upload to Cloudinary</h1>

      {cameraError && <p className="text-red-500">{cameraError}</p>}

      <video ref={videoRef} autoPlay className="rounded-lg shadow-lg w-full max-w-lg" />

      <div className="mt-6 flex gap-4">
        <button onClick={captureImage} className="bg-blue-500 px-4 py-2 rounded">
          Capture
        </button>
        {capturedImage && (
          <button
            onClick={uploadToCloudinary}
            className="bg-green-500 px-4 py-2 rounded"
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        )}
      </div>

      {capturedImage && (
        <div className="mt-6">
          <img src={capturedImage} alt="Captured" className="rounded shadow-md w-80" />
        </div>
      )}
    </div>
  );
}

export default App;
