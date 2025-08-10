import React, { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDocs
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";

// Collapsible with animation
function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-white
                   bg-white/10 backdrop-blur-md border border-white/20 shadow-lg
                   hover:bg-white/20 transition-all duration-300"
      >
        <span className={`transition-transform duration-300 ${open ? "rotate-90" : ""}`}>▶</span>
        {title}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 mt-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-inner"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Blobs background component
function AnimatedBlobs({ blobCount = 6, blur = 140, maxSize = 700 }) {
  const containerRef = useRef(null);
  const blobsRef = useRef([]);
  const rafRef = useRef(null);
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // initialize blobs data
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const colors = ["#FF4D4F", "#4DA6FF", "#FFDA4D"]; // red, blue, yellow

    const blobs = Array.from({ length: blobCount }).map((_, i) => {
      const size = Math.round((Math.random() * 0.6 + 0.25) * maxSize); // 0.25 - 0.85 of maxSize
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const vx = (Math.random() - 0.5) * (prefersReduced ? 0.1 : 0.6); // velocity
      const vy = (Math.random() - 0.5) * (prefersReduced ? 0.1 : 0.6);
      const color = colors[i % colors.length];
      const opacity = Math.random() * 0.35 + 0.15; // 0.15 - 0.5
      return { x, y, vx, vy, size, color, opacity };
    });

    // create DOM elements
    blobsRef.current = blobs.map((b, idx) => {
      const el = document.createElement('div');
      el.className = 'blob-animated';
      el.style.position = 'absolute';
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.pointerEvents = 'none';
      el.style.width = `${b.size}px`;
      el.style.height = `${b.size}px`;
      el.style.borderRadius = '50%';
      el.style.transform = `translate(${b.x}px, ${b.y}px)`;
      el.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), transparent 25%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.06), transparent 40%), ${b.color}`;
      el.style.opacity = `${b.opacity}`;
      el.style.filter = `blur(${Math.round(blur / 4)}px)`; // inner element slightly blurred to soften edges
      el.style.mixBlendMode = 'screen';
      container.appendChild(el);
      return { el, data: b };
    });

    // animation loop
    function step() {
      const bounds = container.getBoundingClientRect();
      blobsRef.current.forEach(item => {
        const d = item.data;
        d.x += d.vx;
        d.y += d.vy;

        // bounce at edges
        if (d.x < -d.size * 0.5) d.x = bounds.width + d.size * 0.5;
        if (d.y < -d.size * 0.5) d.y = bounds.height + d.size * 0.5;
        if (d.x > bounds.width + d.size * 0.5) d.x = -d.size * 0.5;
        if (d.y > bounds.height + d.size * 0.5) d.y = -d.size * 0.5;

        // slightly wobble velocity
        d.vx += (Math.random() - 0.5) * 0.02;
        d.vy += (Math.random() - 0.5) * 0.02;

        item.el.style.transform = `translate(${d.x - d.size / 2}px, ${d.y - d.size / 2}px)`;
      });
      rafRef.current = requestAnimationFrame(step);
    }

    if (!prefersReduced) rafRef.current = requestAnimationFrame(step);

    // cleanup
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      blobsRef.current.forEach(b => b.el.remove());
      blobsRef.current = [];
    };
  }, [blobCount, blur, maxSize, prefersReduced]);

  // wrapper styles applied inline to allow large blur and black background
  return (
    <div
      ref={containerRef}
      aria-hidden
      className="absolute inset-0 -z-20"
      style={{
        background: '#000000',
        overflow: 'hidden',
        filter: `blur(${blur}px)`,
      }}
    />
  );
}

function App() {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const [students, setStudents] = useState([]);
  const [uploads, setUploads] = useState([]);

  // Firestore listeners
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "students"), (snap) => {
      setStudents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    getDocs(collection(db, "uploads")).then(snap => {
      setUploads(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

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
      const shortId = Math.random().toString(36).slice(2, 6);
      const publicId = `preprocessed_${timestamp}_${shortId}`;

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
        status: "pending"
      });

      setStatusMessage("Firestore updated. Waiting for processing...");

      const processedUrl = `https://res.cloudinary.com/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload/processed_images/processed_${timestamp}_${shortId}.jpg`;
      setTimeout(() => {
        setStatusMessage("Processed image might be ready below 👇");
        setStatusType("info");
        setPreviewUrl(processedUrl);
        setIsLoading(false);
      }, 30000);
    } catch (error) {
      setIsLoading(false);
      setStatusMessage(`Upload failed: ${error.message}`);
      setStatusType("error");
    }
  };

  const openCamera = () => inputRef.current?.click();
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) handleImageChange({ target: { files: [file] } });
  };

  const getAttendanceForImage = (imgUrl, processedUrl) => {
    let present = [], absent = [], unknown = [];
    students.forEach(student => {
      if (Array.isArray(student.attendance)) {
        const found = student.attendance.find(att =>
          att.image_url === imgUrl || att.processed_image_url === processedUrl
        );
        if (found) {
          if (found.present === true) present.push(student.name);
          else if (found.present === false) absent.push(student.name);
          else unknown.push(student.name);
        }
      }
    });
    return { present, absent, unknown };
  };

  return (
    <div className="relative min-h-screen px-4 py-6 bg-black overflow-y-auto text-white">
      {/* Animated, blurred blobs background (red / blue / yellow) */}
      <AnimatedBlobs blobCount={7} blur={120} maxSize={800} />

      {/* small subtle star / grain overlay to add depth */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-black/90 to-black/80" />

      {/* Upload */}
      <Collapsible title="📤 Image Upload" defaultOpen={true}>
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`p-6 rounded-3xl border-2 border-dashed transition-all duration-300 
            ${isDragging ? "border-[#00D4FF] bg-[#00D4FF]/10" : "border-white/20 bg-white/5"} 
            backdrop-blur-md`}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <button
              onClick={openCamera}
              disabled={isLoading}
              className="px-8 py-3 rounded-full bg-gradient-to-r from-[#00D4FF] to-[#090979] text-white font-medium shadow-lg hover:shadow-[#00D4FF]/40 transition disabled:opacity-50"
            >
              {isLoading ? "Uploading..." : "Capture / Upload Image"}
            </button>
            <p className="text-sm text-white/80">or drag & drop here</p>
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </div>

          {previewUrl && (
            <div className="mt-5">
              <img src={previewUrl} alt="Preview" className="rounded-xl shadow-xl border border-white/10 max-h-80 mx-auto" />
            </div>
          )}
        </div>

        {/* Toast */}
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`fixed z-50 px-6 py-3 rounded-full text-sm font-medium shadow-lg 
              ${statusType === "success" ? "bg-green-500/90" : statusType === "error" ? "bg-red-500/90" : "bg-yellow-500/90"} 
              text-white top-6 left-1/2 -translate-x-1/2`}
          >
            {statusMessage}
          </motion.div>
        )}
      </Collapsible>

      {/* Uploads */}
      <Collapsible title="🖼 Uploaded Images" defaultOpen={true}>
        {uploads.length === 0 ? (
          <p className="text-white/80">No uploads yet</p>
        ) : (
          uploads.map(upload => {
            const att = getAttendanceForImage(upload.imageUrl, upload.processed_image_url);
            return (
              <Collapsible key={upload.id} title={upload.id}>
                <div className="flex gap-4 flex-wrap">
                  {upload.imageUrl && <img src={upload.imageUrl} alt="Original" className="w-24 rounded-xl shadow-lg" />}
                  {upload.processed_image_url && <img src={upload.processed_image_url} alt="Processed" className="w-24 rounded-xl shadow-lg" />}
                </div>
                <p className="mt-2 text-white/80">Headcount: {upload.headcount ?? "-"}</p>
                <p className="text-white/80">Status: {upload.status ?? "-"}</p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  {att.present.map(name => <span key={name} className="px-3 py-1 rounded-full bg-green-500/20 text-green-300">{name}</span>)}
                  {att.absent.map(name => <span key={name} className="px-3 py-1 rounded-full bg-red-500/20 text-red-300">{name}</span>)}
                  {att.unknown.map(name => <span key={name} className="px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300">{name}</span>)}
                </div>
              </Collapsible>
            );
          })
        )}
      </Collapsible>

      {/* Students */}
      <Collapsible title="👨‍🎓 Students & History">
        {students.length === 0 ? (
          <p className="text-white/80">No students found</p>
        ) : (
          students.map(student => (
            <Collapsible key={student.id} title={`${student.name} (${student.class})`}>
              {Array.isArray(student.attendance) && student.attendance.length === 0 ? (
                <p className="text-white/60">No attendance data</p>
              ) : (
                student.attendance.map((rec, i) => (
                  <Collapsible
                    key={i}
                    title={`${new Date(rec.timestamp).toLocaleString()} - ${rec.present ? "Present" : rec.present === false ? "Absent" : "Unknown"}`}
                  >
                    <div className="flex gap-4">
                      {rec.image_url && <img src={rec.image_url} alt="Original" className="w-20 rounded-xl" />}
                      {rec.processed_image_url && <img src={rec.processed_image_url} alt="Processed" className="w-20 rounded-xl" />}
                    </div>
                  </Collapsible>
                ))
              )}
            </Collapsible>
          ))
        )}
      </Collapsible>
    </div>
  );
}

export default App;
