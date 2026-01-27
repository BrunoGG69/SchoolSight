import React, {useEffect, useRef, useState} from "react";
import {collection, getDocs, onSnapshot, orderBy, query} from "firebase/firestore";
import {db} from "./firebase";
import {handleImageChangeHelper} from "./utils/handleImageChange.js";

// Blob Component
function Blob({color, position, size = "w-96 h-96", delay, className = ""}) {
    return (<div
        className={`absolute ${position} ${size} ${color} rounded-full filter blur-3xl animate-blob ${delay} ${className}`}
        style={{mixBlendMode: "screen"}}
    ></div>);
}

// Blob Background Component
function BlobBackground() {
    return (<div className="absolute top-0 left-0 w-full h-[150%] pointer-events-none -translate-y-32">
        <Blob color="bg-purple-800" size="w-[45rem] h-[45rem]" position="-top-[10%] -left-[10%]"
              delay="animation-delay-1000" style={{zIndex: 0}} className="hidden md:block"/>
        <Blob color="bg-purple-500" size="w-[45rem] h-[45rem]" position="-top-[22%] -right-[13%]"
              delay="animation-delay-2500" style={{zIndex: 0}} className="hidden md:block"/>
        <Blob color="bg-purple-900" size="w-[20rem] h-[20rem]" position="absolute top-1/2 right-10 -translate-y-1/2"
              delay="animation-delay-1000" style={{zIndex: 0}} className="block md:hidden"/>
        <Blob color="bg-indigo-400" size="w-[30rem] h-[30rem]" position="top-[10%] left-[22%]"
              delay="animation-delay-1200" style={{zIndex: 1}} className="hidden md:block"/>
        <Blob color="bg-blue-400" size="w-[30rem] h-[30rem]" position="top-[6%] right-[28%]"
              delay="animation-delay-2200" style={{zIndex: 1}} className="hidden md:block"/>
        <Blob color="bg-blue-400" size="w-[30rem] h-[30rem]" position="top-[33%] right-[12%]"
              delay="animation-delay-1800" style={{zIndex: 4}} className="hidden md:block"/>
        <div className="block md:hidden absolute top-6 right-4 flex-col gap-6 z-10">
            <Blob color="bg-yellow-400" size="w-[12rem] h-[12rem]" position="relative" delay="animation-delay-1200"
                  style={{zIndex: 1}}/>
            <Blob color="bg-yellow-400" size="w-[12rem] h-[12rem]" position="relative -top-3"
                  delay="animation-delay-2200" style={{zIndex: 1}}/>
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-20 z-10 md:flex">
            <Blob color="bg-yellow-400" size="w-[36rem] h-[36rem]"
                  position="absolute top-[28%] right-[30%] -translate-x-1/2 -translate-y-1/2"
                  delay="animation-delay-1700" style={{zIndex: 3}} className="hidden md:block"/>
            <Blob color="bg-red-500" size="w-[34rem] h-[34rem]"
                  position="absolute top-[28%] right-[53%] -translate-x-1/2 -translate-y-1/2"
                  delay="animation-delay-900" style={{zIndex: 5}} className="hidden md:block"/>
        </div>
        <Blob color="bg-red-500" size="w-[25rem] h-[25rem]" position="absolute top-4 left-4"
              delay="animation-delay-1700" style={{zIndex: 5}} className="block md:hidden"/>
        <Blob color="bg-indigo-500" size="w-[25rem] h-[25rem]" position="absolute -bottom-1 -right-1"
              delay="animation-delay-900" style={{zIndex: 5}} className="block md:hidden"/>
        <div className="absolute inset-0 backdrop-blur-4xl"></div>
    </div>);
}

function GlassCard({children, className = ""}) {
    return <div
        className={`z-80 backdrop-blur-lg bg-black/60 border border-white/20 rounded-2xl p-6 shadow-2xl ${className}`}>{children}</div>;
}

const formatDateInWords = (val) => {
    if (!val) return "—";
    try {
        const date = val instanceof Date ? val : new Date(val);
        return date.toLocaleDateString("en-US", {month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"});
    } catch {
        return "—";
    }
};

const formatDate = (val) => {
    if (!val) return "—";
    try {
        if (val instanceof Date) return val.toLocaleString();
        return new Date(val).toLocaleString();
    } catch {
        return "—";
    }
};

const clampPan = ({x, y}, zoom, container) => {
    if (!container) return {x, y};

    const rect = container.getBoundingClientRect();
    const maxX = (rect.width * (zoom - 1)) / 2;
    const maxY = (rect.height * (zoom - 1)) / 2;

    return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
    };
};


export default function CombinedPage() {
    const [statusMessage, setStatusMessage] = useState("");
    const [statusType, setStatusType] = useState("info");
    const [previewUrl, setPreviewUrl] = useState(null);
    const [tempPreviewUrl, setTempPreviewUrl] = useState(null);
    const [tempFile, setTempFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false);
    const [viewerImage, setViewerImage] = useState(null);
    const [isClosingUploadModal, setIsClosingUploadModal] = useState(false);
    const [isClosingImageViewer, setIsClosingImageViewer] = useState(false);
    const [imageZoom, setImageZoom] = useState(1);
    const [imagePan, setImagePan] = useState({x: 0, y: 0});
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({x: 0, y: 0});
    const inputRef = useRef(null);
    const [uploads, setUploads] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedUpload, setSelectedUpload] = useState(null);
    const [loading, setLoading] = useState(true);
    const [viewerMode, setViewerMode] = useState("processed");
    const [lastTap, setLastTap] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [initialPinchDistance, setInitialPinchDistance] = useState(null);
    const [initialZoom, setInitialZoom] = useState(1);
    const imageContainerRef = useRef(null);
    const [isClosingDetails, setIsClosingDetails] = useState(false);
    const [isTapZooming, setIsTapZooming] = useState(false);

    useEffect(() => {
        const shouldLock =
            showUploadModal || showImageViewer;

        if (shouldLock) {
            // Disable scroll
            document.body.style.overflow = "hidden";

            // Disable pinch zoom / overscroll (mobile)
            document.body.style.touchAction = "none";
        } else {
            document.body.style.overflow = "";
            document.body.style.touchAction = "";
        }

        return () => {
            document.body.style.overflow = "";
            document.body.style.touchAction = "";
        };
    }, [showUploadModal, showImageViewer]);


    useEffect(() => {
        const convertTimestamps = (obj) => {
            if (!obj || typeof obj !== "object") return obj;
            const out = {...obj};
            for (const key in out) {
                if (out[key]?.toDate) out[key] = out[key].toDate();
            }
            return out;
        };

        const q = query(collection(db, "uploads"), orderBy("uploadedAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const docs = [];
            snap.forEach((d) => docs.push({id: d.id, ...convertTimestamps(d.data())}));
            setUploads(docs);
            setLoading(false);
        }, (err) => {
            console.error("uploads listener error", err);
            setLoading(false);
        });

        const loadStudents = async () => {
            try {
                const sSnap = await getDocs(collection(db, "students"));
                const sDocs = [];
                sSnap.forEach((d) => sDocs.push({id: d.id, ...convertTimestamps(d.data())}));
                setStudents(sDocs);
            } catch (e) {
                console.error("failed to load students", e);
            }
        };

        loadStudents();
        return () => unsub();
    }, []);

    const handleFileSelect = (file) => {
        if (!file) return;
        const tempUrl = URL.createObjectURL(file);
        setTempPreviewUrl(tempUrl);
        setTempFile(file);
    };

    const handleDrop = (event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    };

    const handleConfirmUpload = async () => {
        if (!tempFile) return;
        setIsLoading(true);
        await handleImageChangeHelper({target: {files: [tempFile]}}, setPreviewUrl, setStatusMessage, setStatusType, setIsLoading);
        setIsLoading(false);
        setShowUploadModal(false);
        setTempPreviewUrl(null);
        setTempFile(null);
    };

    const handleCancelUpload = () => {
        if (tempPreviewUrl) URL.revokeObjectURL(tempPreviewUrl);
        setTempPreviewUrl(null);
        setTempFile(null);
    };

    const closeUploadModal = () => {
        setIsClosingUploadModal(true);
        setTimeout(() => {
            setShowUploadModal(false);
            setIsClosingUploadModal(false);
        }, 300);
    };

    const openImageViewer = (originalUrl, processedUrl, title = "Image") => {
        setViewerImage({originalUrl, processedUrl, title});
        setViewerMode(processedUrl ? "processed" : "original");
        setShowImageViewer(true);
        setImageZoom(1);
        setImagePan({x: 0, y: 0});
    };

    const closeImageViewer = () => {
        setIsClosingImageViewer(true);
        setTimeout(() => {
            setShowImageViewer(false);
            setIsClosingImageViewer(false);
            setViewerImage(null);
            setImageZoom(1);
            setImagePan({x: 0, y: 0});
        }, 300);
    };

    const handleZoomIn = () => {
        setImageZoom(prev => Math.min(prev + 0.1, 5));
    };

    const handleZoomOut = () => {
        setImageZoom(prev => Math.max(prev - 0.1, 1));
        if (imageZoom <= 1.5) {
            setImagePan({x: 0, y: 0});
        }
    };

    const handleResetZoom = () => {
        setImageZoom(1);
        setImagePan({x: 0, y: 0});
    };

    const handleMouseDown = (e) => {
        if (imageZoom > 1) {
            setIsPanning(true);
            setPanStart({x: e.clientX - imagePan.x, y: e.clientY - imagePan.y});
        }
    };

    const handleMouseMove = (e) => {
        if (isPanning && imageZoom > 1) {
            const newPan = {
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            };

            setImagePan(clampPan(newPan, imageZoom, imageContainerRef.current));
        }
    };


    const handleMouseUp = () => {
        setIsPanning(false);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            handleZoomIn();
        } else {
            handleZoomOut();
        }
    };

    const getDistance = (touch1, touch2) => {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const distance = getDistance(e.touches[0], e.touches[1]);
            setInitialPinchDistance(distance);
            setInitialZoom(imageZoom);
        } else if (e.touches.length === 1) {
            const now = Date.now();
            const timeSinceLastTap = now - lastTap;
            if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
                const touch = e.touches[0];
                const container = imageContainerRef.current;
                if (!container) return;

                const rect = container.getBoundingClientRect();
                const tapX = touch.clientX - rect.left;
                const tapY = touch.clientY - rect.top;

                setIsTapZooming(true);

                if (imageZoom === 1) {
                    const targetZoom = 2;

                    const offsetX = (tapX - rect.width / 2) * (targetZoom - 1);
                    const offsetY = (tapY - rect.height / 2) * (targetZoom - 1);

                    const newPan = clampPan(
                        {x: -offsetX, y: -offsetY},
                        targetZoom,
                        container
                    );

                    setImageZoom(targetZoom);
                    setImagePan(newPan);
                } else {
                    setImageZoom(1);
                    setImagePan({x: 0, y: 0});
                }

                // turn animation off after it finishes
                setTimeout(() => setIsTapZooming(false), 350);
            }


            setLastTap(now);

            if (imageZoom > 1) {
                setTouchStart({
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                    panX: imagePan.x,
                    panY: imagePan.y
                });
            }
        }
    };

    const handleTouchMove = (e) => {
        const container = imageContainerRef.current;
        if (!container) return;

        // 🔹 PINCH ZOOM
        if (e.touches.length === 2 && initialPinchDistance) {
            e.preventDefault();

            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const scale = currentDistance / initialPinchDistance;
            const newZoom = Math.min(Math.max(initialZoom * scale, 1), 5);

            setImageZoom(newZoom);

            // Clamp pan during zoom
            setImagePan(prev =>
                clampPan(prev, newZoom, container)
            );

            if (newZoom <= 1) {
                setImagePan({x: 0, y: 0});
            }

            return;
        }

        // 🔹 PAN
        if (e.touches.length === 1 && touchStart && imageZoom > 1) {
            e.preventDefault();

            const deltaX = e.touches[0].clientX - touchStart.x;
            const deltaY = e.touches[0].clientY - touchStart.y;

            const newPan = {
                x: touchStart.panX + deltaX,
                y: touchStart.panY + deltaY
            };

            setImagePan(
                clampPan(newPan, imageZoom, container)
            );
        }
    };


    const handleTouchEnd = () => {
        setInitialPinchDistance(null);
        setTouchStart(null);
    };

    const handleBackToList = () => {
        setIsClosingDetails(true);
        setTimeout(() => {
            setSelectedUpload(null);
            setIsClosingDetails(false);
        }, 300);
    };

    const getPresentCountForUpload = (upload) => {
        if (!upload) return 0;
        if (typeof upload.headcount === "number") return upload.headcount;
        if (Array.isArray(upload.recognized)) return upload.recognized.filter((r) => r.present).length;
        if (students.length && (upload.imageUrl || upload.processed_image_url || upload.uploadedAt)) {
            const identifier = upload.imageUrl || upload.processed_image_url || upload.uploadedAt;
            let count = 0;
            students.forEach((s) => {
                const attendance = s.attendance;
                if (Array.isArray(attendance)) {
                    if (attendance.some((a) => a.image_url === identifier || a.processed_image_url === identifier || a.timestamp === upload.uploadedAt)) count++;
                }
            });
            return count;
        }
        return 0;
    };

    return (<div className="min-h-screen bg-black relative overflow-hidden text-white">
        <BlobBackground/>

        {isLoading && (<div className="fixed top-0 left-0 right-0 z-50 h-1 bg-white/20">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-pulse"
                 style={{animation: "loadingBar 2s ease-in-out infinite"}}></div>
        </div>)}

        <style>{`
        @keyframes loadingBar {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.95); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-fade-out {
          animation: fadeOut 0.3s ease-out forwards;
        }
        .ghost-shimmer {
          background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
          background-size: 1000px 100%;
          animation: shimmer 2s infinite;
        }
        .animate-pulse-slow {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes blurIn {
          from { backdrop-filter: blur(0px); opacity: 0; }
          to { backdrop-filter: blur(20px); opacity: 1; }
        }
        
        @keyframes blurOut {
          from { backdrop-filter: blur(20px); opacity: 1; }
          to { backdrop-filter: blur(0px); opacity: 0; }
        }
        
        .animate-blur-in {
          animation: blurIn 0.35s ease forwards;
        }
        
        .animate-blur-out {
          animation: blurOut 0.35s ease forwards;
        }

        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(100%);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideOutRight {
          from { 
            opacity: 1;
            transform: translateX(0);
          }
          to { 
            opacity: 0;
            transform: translateX(100%);
          }
        }

        .animate-slide-in-right {
          animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-slide-out-right {
          animation: slideOutRight 0.3s cubic-bezier(0.7, 0, 0.84, 0) forwards;
        }

        @keyframes slideInLeft {
          from { 
            opacity: 0;
            transform: translateX(-30px);
          }
          to { 
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-slide-in-left {
          animation: slideInLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes modeSwitch {
          0% { 
            opacity: 0;
            transform: scale(0.95);
          }
          100% { 
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-mode-switch {
          animation: modeSwitch 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes toggleSlide {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .toggle-indicator {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

        <button onClick={() => setShowUploadModal(true)}
                className="fixed bottom-8 right-8 z-30 bg-cyan-500 hover:bg-cyan-600 text-white p-5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:rotate-90 active:scale-95">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
            </svg>
        </button>

        {showUploadModal && (<div className="fixed inset-0 z-40 flex items-center justify-center px-4">
            <div
                className={`absolute inset-0 bg-black/40 backdrop-blur-lg ${isClosingUploadModal ? 'animate-blur-out' : 'animate-blur-in'}`}
                onClick={() => {
                    if (!tempPreviewUrl && !isLoading) closeUploadModal();
                }}></div>
            <div
                className={`relative z-50 backdrop-blur-xl bg-black/50 border border-white/30 rounded-3xl p-8 shadow-2xl max-w-lg w-full ${isClosingUploadModal ? 'animate-fade-out' : 'animate-fade-in'}`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white">Upload Image</h3>
                    <button onClick={() => {
                        if (!isLoading) {
                            handleCancelUpload();
                            closeUploadModal();
                        }
                    }} disabled={isLoading}
                            className="text-gray-400 hover:text-white hover:rotate-90 transition-all duration-300 disabled:opacity-50 active:scale-90">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
                             viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                {!tempPreviewUrl ? (<div
                    className={`relative border-2 border-dashed rounded-2xl p-10 transition-all duration-300 ${isDragging ? "border-cyan-400 bg-cyan-400/20 scale-105" : "border-white/30 hover:border-white/50"}`}
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
                    <input ref={inputRef} type="file" accept="image/*" capture="environment"
                           className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                    }}/>
                    <div className="flex flex-col items-center gap-5 text-center">
                        <div className="bg-cyan-500/20 p-6 rounded-full">
                            <svg className="w-14 h-14 text-cyan-400" fill="none" stroke="currentColor"
                                 strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round"
                                      d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z"/>
                                <circle cx="12" cy="13" r="4"/>
                            </svg>
                        </div>
                        <div><h4 className="text-xl font-semibold text-white mb-2">Select or Capture
                            Photo</h4><p className="text-sm text-gray-400">Drag & drop or click to
                            browse</p></div>
                        <button onClick={() => inputRef.current?.click()}
                                className="w-full bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg">Choose
                            File
                        </button>
                    </div>
                </div>) : (<div className="space-y-5">
                    <div className="rounded-xl overflow-hidden border-2 border-white/30 shadow-xl animate-fade-in"><img
                        src={tempPreviewUrl} alt="Preview"
                        className="w-full max-h-96 object-contain bg-black/60"/></div>
                    <div className="text-center"><p className="text-white text-lg font-medium">Confirm this
                        image for attendance?</p></div>
                    <div className="flex gap-4">
                        <button onClick={handleCancelUpload} disabled={isLoading}
                                className="flex-1 bg-white/10 hover:bg-white/20 active:scale-95 border-2 border-white/30 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50">Cancel
                        </button>
                        <button onClick={handleConfirmUpload} disabled={isLoading}
                                className="flex-1 bg-cyan-500 hover:bg-cyan-600 active:scale-95 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg">
                            {isLoading &&
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg"
                                     fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10"
                                            stroke="currentColor" strokeWidth="4"/>
                                    <path className="opacity-75" fill="currentColor"
                                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                                </svg>}
                            {isLoading ? "Uploading..." : "Confirm Upload"}
                        </button>
                    </div>
                </div>)}
            </div>
        </div>)}

        {showImageViewer && viewerImage && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className={`absolute inset-0 bg-black/70 ${isClosingImageViewer ? "animate-blur-out" : "animate-blur-in"}`}
                    onClick={closeImageViewer}
                />
                <div
                    className={`relative z-50 w-full max-w-6xl ${isClosingImageViewer ? 'animate-fade-out' : 'animate-fade-in'}`}>
                    <div
                        className="backdrop-blur-xl bg-black/60 border border-white/30 rounded-3xl p-4 md:p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg md:text-2xl font-bold text-white truncate pr-4">{viewerImage.title}</h3>
                            <button onClick={closeImageViewer}
                                    className="text-gray-400 hover:text-white hover:rotate-90 active:scale-90 transition-all duration-300 flex-shrink-0">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round"
                                          d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div
                            className="rounded-xl overflow-hidden border-2 border-white/30 shadow-xl bg-black/60 relative"
                            ref={imageContainerRef}
                            onWheel={handleWheel}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            style={{
                                cursor: imageZoom > 1 ? (isPanning || touchStart ? 'grabbing' : 'grab') : 'default',
                                touchAction: 'none'
                            }}
                        >
                            <img
                                src={
                                    viewerMode === "processed"
                                        ? viewerImage.processedUrl
                                        : viewerImage.originalUrl
                                }
                                alt={viewerImage.title}
                                className="w-full max-h-[70vh] md:max-h-[75vh] object-contain transition-opacity duration-200 animate-mode-switch"
                                key={viewerMode}
                                style={{
                                    transform: `scale(${imageZoom}) translate(${imagePan.x / imageZoom}px, ${imagePan.y / imageZoom}px)`,
                                    transformOrigin: 'center',
                                    transition: isTapZooming
                                        ? 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
                                        : 'none'
                                }}
                                onMouseDown={handleMouseDown}
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                draggable={false}
                            />

                            <div
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
                                {viewerImage.processedUrl && (
                                    <div
                                        className="relative bg-black/70 backdrop-blur-md rounded-full p-1 border border-white/20">
                                        <div className="flex gap-0 relative">
                                            <div
                                                className={`absolute inset-1 w-[calc(50%-2px)] rounded-full bg-cyan-500 toggle-indicator transition-transform duration-300 ease-out ${viewerMode === "processed" ? "translate-x-full" : "translate-x-0"}`}
                                            />
                                            <button
                                                onClick={() => setViewerMode("original")}
                                                className={`relative z-10 px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-semibold transition-colors duration-300 min-w-[90px] md:min-w-[100px]
                                                    ${viewerMode === "original" ? "text-white" : "text-gray-300"}`}
                                            >
                                                Original
                                            </button>
                                            <button
                                                onClick={() => setViewerMode("processed")}
                                                className={`relative z-10 px-4 md:px-5 py-2 rounded-full text-xs md:text-sm font-semibold transition-colors duration-300 min-w-[90px] md:min-w-[100px]
                                                    ${viewerMode === "processed" ? "text-white" : "text-gray-300"}`}
                                            >
                                                Processed
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div
                                    className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full px-3 md:px-4 py-2 border border-white/20">
                                    <button onClick={handleZoomOut} disabled={imageZoom <= 1}
                                            className="text-white hover:text-cyan-400 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"/>
                                        </svg>
                                    </button>
                                    <span
                                        className="text-white text-xs md:text-sm font-medium min-w-[3rem] text-center">{Math.round(imageZoom * 100)}%</span>
                                    <button onClick={handleZoomIn} disabled={imageZoom >= 5}
                                            className="text-white hover:text-cyan-400 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"
                                             viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                                        </svg>
                                    </button>
                                    {imageZoom > 0 && (
                                        <button onClick={handleResetZoom}
                                                className="text-white hover:text-cyan-400 active:scale-90 transition-all ml-1">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor"
                                                 strokeWidth="2" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>


                        <div className="text-center mt-3 animate-fade-in">
                            <p className="text-xs text-gray-400">Double tap or pinch to zoom • Drag to pan</p>
                        </div>

                    </div>
                </div>
            </div>
        )}

        <div className="relative z-20 px-6 py-8 md:py-5 border-b border-white/10">
            <div className="max-w-7xl mx-auto"><h1 className="text-4xl font-bold text-white mb-2">SchoolSight</h1><p
                className="text-gray-300 text-lg">Attendance Management System</p></div>
        </div>

        <div className="relative z-20 max-w-7xl mx-auto px-8 py-8">
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-64 flex-shrink-0">
                    {/*<div className="*/}
                    {/*      flex justify-center gap-4 overflow-x-auto pb-2*/}
                    {/*      lg:block lg:space-y-4 lg:overflow-visible*/}
                    {/*       top-8*/}
                    {/*    ">*/}
                    {/*    <GlassCard className="active:scale-95 transition-transform duration-300">*/}
                    {/*        <div className="text-sm text-gray-300 mb-1">Total Uploads</div>*/}
                    {/*        <div className="text-4xl font-bold text-cyan-400">{uploads.length}</div>*/}
                    {/*    </GlassCard>*/}
                    {/*    <GlassCard className="active:scale-95 transition-transform duration-300">*/}
                    {/*        <div className="text-sm text-gray-300 mb-1">Students</div>*/}
                    {/*        <div className="text-4xl font-bold text-cyan-400">{students.length}</div>*/}
                    {/*    </GlassCard>*/}
                    {/*    <GlassCard className="active:scale-95 transition-transform duration-300">*/}
                    {/*        <div className="text-sm text-gray-300 mb-1">Last Processed</div>*/}
                    {/*        <div*/}
                    {/*            className="text-xl text-cyan-400 mt-2 font-bold">{uploads[0] ? formatDateInWords(uploads[0].uploadedAt) : '—'}</div>*/}
                    {/*    </GlassCard>*/}
                    {/*</div>*/}

                    {/* Desktop stats (cards) */}
                    <div
                        className="
                        hidden lg:flex flex-col justify-center gap-4
                        lg:block lg:space-y-4 lg:overflow-visible
                        top-8
                      ">
                        <GlassCard className="active:scale-95 transition-transform duration-300">
                            <div className="text-sm text-gray-300 mb-1">Total Uploads</div>
                            <div className="text-4xl font-bold text-cyan-400">
                                {uploads.length}
                            </div>
                        </GlassCard>

                        <GlassCard className="active:scale-95 transition-transform duration-300">
                            <div className="text-sm text-gray-300 mb-1">Students</div>
                            <div className="text-4xl font-bold text-cyan-400">
                                {students.length}
                            </div>
                        </GlassCard>

                        <GlassCard className="active:scale-95 transition-transform duration-300">
                            <div className="text-sm text-gray-300 mb-1">Last Processed</div>
                            <div className="text-xl text-cyan-400 mt-2 font-bold">
                                {uploads[0] ? formatDateInWords(uploads[0].uploadedAt) : "—"}
                            </div>
                        </GlassCard>
                    </div>
                    {/* Mobile stats (compact, like Status box) */}
                    <div className="lg:hidden space-y-1 text-sm bg-black/60 rounded-xl p-2 border border-white/20">

                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                            <span className="text-gray-300 font-medium">Total Uploads</span>
                            <span className="text-cyan-400 font-bold">{uploads.length}</span>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                            <span className="text-gray-300 font-medium">Students</span>
                            <span className="text-cyan-400 font-bold">{students.length}</span>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <span className="text-gray-300 font-medium">Last Processed</span>
                            <span className="text-white font-mono text-xs">
                              {uploads[0] ? formatDateInWords(uploads[0].uploadedAt) : "—"}
                            </span>
                        </div>

                    </div>


                </div>

                <div className="flex-1">
                    <GlassCard>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-3xl font-bold text-white">Upload History</h2>
                            {selectedUpload && (<button onClick={handleBackToList}
                                                        className="text-sm text-gray-300 hover:text-white active:scale-80 transition-all flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                                </svg>
                                Back to list</button>)}
                        </div>

                        {!selectedUpload ? (<div className={!isClosingDetails ? "animate-slide-in-left" : ""}>
                            {loading && (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[1, 2, 3, 4, 5, 6].map((i) => (<div key={i}
                                                                     className="p-5 rounded-xl bg-white/5 border border-white/20 ghost-shimmer">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1">
                                            <div className="h-6 bg-white/10 rounded w-32 mb-2"></div>
                                            <div className="h-4 bg-white/10 rounded w-24"></div>
                                        </div>
                                        <div className="text-right">
                                            <div className="h-8 w-12 bg-white/10 rounded mb-1"></div>
                                            <div className="h-3 bg-white/10 rounded w-12"></div>
                                        </div>
                                    </div>
                                    <div className="h-6 bg-white/10 rounded w-20"></div>
                                </div>))}
                            </div>)}
                            {!loading && uploads.length === 0 && (<div className="text-center py-16 animate-fade-in">
                                <div
                                    className="bg-cyan-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-cyan-400" fill="none" stroke="currentColor"
                                         strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                                    </svg>
                                </div>
                                <p className="text-gray-400 text-lg">No uploads yet</p><p
                                className="text-gray-500 text-sm mt-2">Click the + button to upload your first
                                image</p></div>)}

                            <div
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[80vh] overflow-auto p-4">
                                {uploads.map((u) => (<button key={u.id} onClick={() => setSelectedUpload(u)}
                                                             className="text-left p-5 rounded-xl bg-white/5 border border-white/20 hover:bg-white/10 hover:border-cyan-400/50 hover:scale-105 active:scale-95 transition-all duration-300 relative z-60">
                                    <div className="flex items-start justify-between gap-4 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div
                                                className="font-semibold text-white text-lg mb-1">{formatDateInWords(u.uploadedAt)}</div>
                                            <div
                                                className="text-xs text-gray-200">{u.folder || "captured_images"}</div>
                                        </div>
                                        <div className="text-right">
                                            <div
                                                className="text-3xl font-bold text-cyan-400">{getPresentCountForUpload(u)}</div>
                                            <div className="text-xs text-gray-200">present</div>
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${u.status === "processed" ? "bg-green-500/30 text-green-200" : "bg-yellow-500/30 text-yellow-200"}`}>{u.status || "pending"}</span>
                                </button>))}
                            </div>
                        </div>) : (<div
                            className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${!isClosingDetails ? "animate-slide-in-right" : "animate-slide-out-right"}`}>
                            <div>
                                <h3 className="font-bold text-xl mb-4 text-white">Upload Details</h3>
                                <div
                                    onClick={() => openImageViewer(selectedUpload.imageUrl, selectedUpload.processed_image_url || selectedUpload.processed_image, "Attendance Image")}
                                    className="rounded-xl overflow-hidden border-2 border-white/30 mb-4 shadow-lg hover:scale-105 active:scale-95 transition-transform duration-300 cursor-pointer group relative"
                                >
                                    <img
                                        src={selectedUpload.processed_image_url || selectedUpload.processed_image || selectedUpload.imageUrl}
                                        alt="processed" className="w-full h-64 object-contain bg-black/60"
                                        onError={(e) => {
                                            e.currentTarget.src = selectedUpload.imageUrl || "";
                                        }}/>
                                    <div
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor"
                                             strokeWidth="2" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                                        </svg>
                                    </div>
                                </div>
                                <div
                                    className="space-y-1 text-sm bg-white/5 rounded-xl p-2 border border-white/20">
                                    <div
                                        className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-300 font-medium">Status</span><span
                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${selectedUpload.status === "processed" ? "bg-green-500/30 text-green-200" : "bg-yellow-500/30 text-yellow-200"}`}>{selectedUpload.status || "pending"}</span>
                                    </div>
                                    <div
                                        className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-300 font-medium">Uploaded</span><span
                                        className="text-white font-mono text-xs">{formatDate(selectedUpload.uploadedAt)}</span>
                                    </div>
                                    {selectedUpload.processed_at && (<div
                                        className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-300 font-medium">Processed</span><span
                                        className="text-white font-mono text-xs">{formatDate(selectedUpload.processed_at)}</span>
                                    </div>)}
                                    {selectedUpload.headcount !== undefined && (
                                        <div className="flex items-center justify-between py-2"><span
                                            className="text-gray-300 font-medium">Headcount</span><span
                                            className="text-cyan-400 font-bold text-lg">{selectedUpload.headcount}</span>
                                        </div>)}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-xl mb-4 text-white px-4">Recognized Students</h3>
                                <div className="max-h-[65vh] overflow-auto space-y-2 px-4 pt-2">
                                    {selectedUpload.status !== "processed" ? (
                                        <div className="text-center py-12">
                                            <div
                                                className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                                            <p className="text-sm text-gray-400">Processing...</p></div>) : (<>
                                        {Array.isArray(selectedUpload.recognized) && selectedUpload.recognized.length > 0 ? (selectedUpload.recognized.map((r, i) => (
                                            <div key={i}
                                                 className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/20 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300">
                                                <div>
                                                    <div
                                                        className="font-semibold text-white text-lg">{r.name || r.id || "Unknown"}</div>
                                                    <div
                                                        className="text-xs text-gray-400">{r.class || ""} {r.score ? `• Score: ${r.score}` : ""}</div>
                                                </div>
                                                <div
                                                    className={`px-4 py-2 rounded-full text-sm font-bold ${r.present ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"}`}>{r.present ? "Present" : "Absent"}</div>
                                            </div>))) : (<>{students.length === 0 ? (
                                            <p className="text-sm text-gray-400 text-center py-8">No student
                                                data available</p>) : (students.map((s) => {
                                            const att = Array.isArray(s.attendance) ? s.attendance.find((a) => a.image_url === selectedUpload.imageUrl || a.processed_image_url === selectedUpload.processed_image_url || a.timestamp === selectedUpload.uploadedAt) : null;
                                            if (!att) return null;
                                            return (<div key={s.id}
                                                         className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/20 hover:bg-white/10 hover:scale-105 active:scale-95 transition-all duration-300">
                                                <div>
                                                    <div
                                                        className="font-semibold text-white text-lg">{s.name || s.id}</div>
                                                    <div className="text-xs text-gray-400">{s.class || ""}</div>
                                                </div>
                                                <div
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold ${att.present ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"}`}>{att.present ? "Present" : "Absent"}</div>
                                            </div>);
                                        }))}</>)}
                                    </>)}
                                </div>
                            </div>
                        </div>)}
                    </GlassCard>
                </div>
            </div>
        </div>

        {statusMessage && (<div
            className={`fixed z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 flex items-center gap-3 backdrop-blur-md animate-fade-in ${statusType === "success" ? "bg-green-600/90 text-white" : statusType === "error" ? "bg-red-600/90 text-white" : "bg-yellow-500/90 text-black"} bottom-6 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0`}>
            {statusType === "success" && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M9 12l2 2l4-4M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10s-4.48 10-10 10z"/>
                </svg>)}
            {statusType === "error" && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M12 9v2m0 4h.01M12 2a10 10 0 110 20a10 10 0 010-20z"/>
                </svg>)}
            <span>{statusMessage}</span>
        </div>)}
    </div>);
}