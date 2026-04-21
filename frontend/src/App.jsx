import React, {useEffect, useRef, useState} from "react";
import {collection, getDocs, onSnapshot, orderBy, query} from "firebase/firestore";
import {db} from "./firebase";
import {handleImageChangeHelper} from "./utils/handleImageChange.js";

function BlobBackground() {
    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{zIndex: 0}}>
            <div className="absolute inset-0 bg-[#060612]"/>
            <div
                className="absolute rounded-full animate-blob"
                style={{
                    width: "70vw", height: "70vw",
                    top: "-20%", left: "-15%",
                    background: "radial-gradient(circle, rgba(109,40,217,0.55) 0%, transparent 70%)",
                    filter: "blur(40px)",
                    animationDelay: "0s",
                }}
            />
            <div
                className="absolute rounded-full animate-blob"
                style={{
                    width: "60vw", height: "60vw",
                    top: "-10%", right: "-10%",
                    background: "radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)",
                    filter: "blur(50px)",
                    animationDelay: "2s",
                }}
            />
            <div
                className="absolute rounded-full animate-blob hidden md:block"
                style={{
                    width: "55vw", height: "55vw",
                    bottom: "-15%", left: "10%",
                    background: "radial-gradient(circle, rgba(220,38,38,0.35) 0%, transparent 70%)",
                    filter: "blur(60px)",
                    animationDelay: "4s",
                }}
            />
            <div
                className="absolute rounded-full animate-blob hidden md:block"
                style={{
                    width: "40vw", height: "40vw",
                    top: "40%", right: "5%",
                    background: "radial-gradient(circle, rgba(6,182,212,0.25) 0%, transparent 70%)",
                    filter: "blur(50px)",
                    animationDelay: "1.5s",
                }}
            />
            <div
                className="absolute rounded-full animate-blob block md:hidden"
                style={{
                    width: "120vw", height: "60vh",
                    bottom: "-10%", right: "-20%",
                    background: "radial-gradient(circle, rgba(220,38,38,0.3) 0%, rgba(109,40,217,0.2) 60%, transparent 80%)",
                    filter: "blur(40px)",
                    animationDelay: "3s",
                }}
            />
            <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    backgroundSize: "200px 200px",
                }}
            />
            <div
                className="absolute inset-0"
                style={{background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)"}}
            />
        </div>
    );
}

function GlassCard({children, className = ""}) {
    return (
        <div className={`backdrop-blur-xl bg-black/50 border border-white/10 rounded-2xl shadow-2xl ${className}`}>
            {children}
        </div>
    );
}

function Avatar({name}) {
    const initials = (name || "?")
        .split(" ")
        .slice(0, 2)
        .map(w => w[0])
        .join("")
        .toUpperCase();

    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const hue = Math.abs(hash) % 360;

    return (
        <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{background: `hsl(${hue}, 55%, 32%)`}}
        >
            {initials}
        </div>
    );
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
        return val instanceof Date ? val.toLocaleString() : new Date(val).toLocaleString();
    } catch {
        return "—";
    }
};

const clampPan = ({x, y}, zoom, container) => {
    if (!container) return {x, y};
    const rect = container.getBoundingClientRect();
    const maxX = (rect.width * (zoom - 1)) / 2;
    const maxY = (rect.height * (zoom - 1)) / 2;
    return {x: Math.min(maxX, Math.max(-maxX, x)), y: Math.min(maxY, Math.max(-maxY, y))};
};

const getAttendanceBorderColor = (present, total) => {
    if (total === 0) return "border-l-white/20";
    const ratio = present / total;
    if (ratio >= 0.7) return "border-l-emerald-500";
    if (ratio >= 0.4) return "border-l-amber-400";
    return "border-l-red-500";
};

const getAttendanceBadgeColor = (present, total) => {
    if (total === 0) return "text-gray-400";
    const ratio = present / total;
    if (ratio >= 0.7) return "text-emerald-400";
    if (ratio >= 0.4) return "text-amber-400";
    return "text-red-400";
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
        const lock = showUploadModal || showImageViewer;
        document.body.style.overflow = lock ? "hidden" : "";
        document.body.style.touchAction = lock ? "none" : "";
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

    const getPresentCountForUpload = (upload) => {
        if (!upload) return 0;
        if (Array.isArray(upload.recognized)) {
            return upload.recognized.filter(r => r.present === true).length;
        }

        if (students.length) {
            let count = 0;
            students.forEach(s => {
                if (Array.isArray(s.attendance)) {
                    if (s.attendance.some(a =>
                        (a.image_url === upload.imageUrl ||
                            a.processed_image_url === upload.processed_image_url ||
                            a.timestamp === upload.uploadedAt) &&
                        a.present === true   // 🔥 IMPORTANT
                    )) {
                        count++;
                    }
                }
            });
            return count;
        }
        return 0;
    };

    const avgAttendanceRate = () => {
        const processed = uploads.filter(u => u.status === "processed");
        if (!processed.length || !students.length) return null;
        const avg = processed.reduce((sum, u) => sum + getPresentCountForUpload(u), 0) / processed.length;
        return Math.round((avg / students.length) * 100);
    };

    const handleFileSelect = (file) => {
        if (!file) return;
        setTempPreviewUrl(URL.createObjectURL(file));
        setTempFile(file);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
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
    const handleZoomIn = () => setImageZoom(p => Math.min(p + 0.1, 5));
    const handleZoomOut = () => {
        setImageZoom(p => Math.max(p - 0.1, 1));
        if (imageZoom <= 1.5) setImagePan({x: 0, y: 0});
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
        if (isPanning && imageZoom > 1)
            setImagePan(clampPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y
            }, imageZoom, imageContainerRef.current));
    };
    const handleMouseUp = () => setIsPanning(false);
    const handleWheel = (e) => {
        e.preventDefault();
        e.deltaY < 0 ? handleZoomIn() : handleZoomOut();
    };

    const getDistance = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            setInitialPinchDistance(getDistance(e.touches[0], e.touches[1]));
            setInitialZoom(imageZoom);
        } else if (e.touches.length === 1) {
            const now = Date.now();
            if (now - lastTap < 300) {
                const touch = e.touches[0];
                const container = imageContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                setIsTapZooming(true);
                if (imageZoom === 1) {
                    const targetZoom = 2;
                    const offsetX = (touch.clientX - rect.left - rect.width / 2) * (targetZoom - 1);
                    const offsetY = (touch.clientY - rect.top - rect.height / 2) * (targetZoom - 1);
                    setImageZoom(targetZoom);
                    setImagePan(clampPan({x: -offsetX, y: -offsetY}, targetZoom, container));
                } else {
                    setImageZoom(1);
                    setImagePan({x: 0, y: 0});
                }
                setTimeout(() => setIsTapZooming(false), 350);
            }
            setLastTap(now);
            if (imageZoom > 1)
                setTouchStart({x: e.touches[0].clientX, y: e.touches[0].clientY, panX: imagePan.x, panY: imagePan.y});
        }
    };
    const handleTouchMove = (e) => {
        const container = imageContainerRef.current;
        if (!container) return;
        if (e.touches.length === 2 && initialPinchDistance) {
            e.preventDefault();
            const newZoom = Math.min(Math.max(initialZoom * getDistance(e.touches[0], e.touches[1]) / initialPinchDistance, 1), 5);
            setImageZoom(newZoom);
            setImagePan(prev => clampPan(prev, newZoom, container));
            if (newZoom <= 1) setImagePan({x: 0, y: 0});
            return;
        }
        if (e.touches.length === 1 && touchStart && imageZoom > 1) {
            e.preventDefault();
            setImagePan(clampPan({
                x: touchStart.panX + e.touches[0].clientX - touchStart.x,
                y: touchStart.panY + e.touches[0].clientY - touchStart.y
            }, imageZoom, container));
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

    const avgRate = avgAttendanceRate();
    const getSortedStudentList = (upload) => {
        if (!upload) return {present: [], absent: []};
        if (Array.isArray(upload.recognized) && upload.recognized.length > 0) {
            return {
                present: upload.recognized.filter(r => r.present),
                absent: upload.recognized.filter(r => !r.present),
            };
        }
        const presentList = [], absentList = [];
        students.forEach(s => {
            const att = Array.isArray(s.attendance)
                ? s.attendance.find(a =>
                    a.image_url === upload.imageUrl ||
                    a.processed_image_url === upload.processed_image_url ||
                    a.timestamp === upload.uploadedAt)
                : null;
            if (!att) return;
            if (att.present) presentList.push({...s, _att: att});
            else absentList.push({...s, _att: att});
        });
        return {present: presentList, absent: absentList};
    };

    return (
        <div className="min-h-screen relative overflow-x-hidden text-white">
            <BlobBackground/>

            {/* ── Global CSS ── */}
            <style>{`
                @keyframes blob {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33%       { transform: translate(30px, -30px) scale(1.05); }
                    66%       { transform: translate(-20px, 20px) scale(0.97); }
                }
                .animate-blob { animation: blob 14s ease-in-out infinite; }

                @keyframes fadeIn  { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
                @keyframes fadeOut { from { opacity:1; transform:scale(1);    } to { opacity:0; transform:scale(0.96); } }
                .animate-fade-in  { animation: fadeIn  0.3s ease-out forwards; }
                .animate-fade-out { animation: fadeOut 0.3s ease-out forwards; }

                @keyframes blurIn  { from { backdrop-filter:blur(0); opacity:0; } to { backdrop-filter:blur(20px); opacity:1; } }
                @keyframes blurOut { from { backdrop-filter:blur(20px); opacity:1; } to { backdrop-filter:blur(0); opacity:0; } }
                .animate-blur-in  { animation: blurIn  0.35s ease forwards; }
                .animate-blur-out { animation: blurOut 0.35s ease forwards; }

                @keyframes slideInRight  { from { opacity:0; transform:translateX(40px);  } to { opacity:1; transform:translateX(0); } }
                @keyframes slideOutRight { from { opacity:1; transform:translateX(0);      } to { opacity:0; transform:translateX(40px); } }
                @keyframes slideInLeft   { from { opacity:0; transform:translateX(-30px);  } to { opacity:1; transform:translateX(0); } }
                .animate-slide-in-right  { animation: slideInRight  0.35s cubic-bezier(0.16,1,0.3,1) forwards; }
                .animate-slide-out-right { animation: slideOutRight 0.25s cubic-bezier(0.7,0,0.84,0) forwards; }
                .animate-slide-in-left   { animation: slideInLeft   0.35s cubic-bezier(0.16,1,0.3,1) forwards; }

                @keyframes shimmer {
                    0%   { background-position: -1000px 0; }
                    100% { background-position:  1000px 0; }
                }
                .ghost-shimmer {
                    background: linear-gradient(90deg,rgba(255,255,255,0.03) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.03) 75%);
                    background-size: 1000px 100%;
                    animation: shimmer 2s infinite;
                }

                @keyframes loadingBar { 0%{width:0%} 50%{width:70%} 100%{width:100%} }

                .toggle-indicator { transition: transform 0.3s cubic-bezier(0.16,1,0.3,1); }

                /* thin custom scrollbar */
                .custom-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scroll::-webkit-scrollbar-track { background: transparent; }
                .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 99px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.3); }

                /* stat chip row hide scrollbar on mobile */
                .stat-strip { -ms-overflow-style:none; scrollbar-width:none; }
                .stat-strip::-webkit-scrollbar { display:none; }
            `}</style>

            {/* ── Loading bar ── */}
            {isLoading && (
                <div className="fixed top-0 left-0 right-0 z-50 h-[2px] bg-white/10">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                         style={{animation: "loadingBar 2s ease-in-out infinite"}}/>
                </div>
            )}
            <button
                onClick={() => setShowUploadModal(true)}
                className="fixed bottom-6 right-6 z-30 flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold pl-5 pr-5 py-3.5 rounded-full shadow-2xl shadow-cyan-500/30 transition-all duration-300 hover:scale-105 active:scale-95 group"
                aria-label="Upload image"
            >
                <svg className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" fill="none"
                     stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                <span className="text-sm hidden sm:inline">Upload</span>
            </button>

            {showUploadModal && (
                <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center sm:px-4">
                    <div
                        className={`absolute inset-0 bg-black/60 ${isClosingUploadModal ? 'animate-blur-out' : 'animate-blur-in'}`}
                        onClick={() => {
                            if (!tempPreviewUrl && !isLoading) closeUploadModal();
                        }}
                    />
                    <div
                        className={`relative z-50 w-full sm:max-w-lg backdrop-blur-2xl bg-black/70 border border-white/15 sm:rounded-3xl rounded-t-3xl p-6 sm:p-8 shadow-2xl ${isClosingUploadModal ? 'animate-fade-out' : 'animate-fade-in'}`}>
                        {/* drag handle (mobile) */}
                        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5 sm:hidden"/>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-white">Upload Image</h3>
                            <button
                                onClick={() => {
                                    if (!isLoading) {
                                        handleCancelUpload();
                                        closeUploadModal();
                                    }
                                }}
                                disabled={isLoading}
                                className="text-gray-400 hover:text-white hover:rotate-90 transition-all duration-300 disabled:opacity-50 active:scale-90 p-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"
                                     viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        {!tempPreviewUrl ? (
                            <div
                                className={`relative border-2 border-dashed rounded-2xl p-10 transition-all duration-300 ${isDragging ? "border-cyan-400 bg-cyan-400/10 scale-[1.02]" : "border-white/20 hover:border-white/40"}`}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                            >
                                <input ref={inputRef} type="file" accept="image/*" capture="environment"
                                       className="hidden"
                                       onChange={(e) => {
                                           const f = e.target.files?.[0];
                                           if (f) handleFileSelect(f);
                                       }}/>
                                <div className="flex flex-col items-center gap-4 text-center">
                                    <div className="bg-cyan-500/15 p-5 rounded-full border border-cyan-500/20">
                                        <svg className="w-12 h-12 text-cyan-400" fill="none" stroke="currentColor"
                                             strokeWidth="1.5" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z"/>
                                            <circle cx="12" cy="13" r="4"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-semibold text-white mb-1">Take or Choose a
                                            Photo</h4>
                                        <p className="text-sm text-gray-500">Drag & drop, or click below</p>
                                    </div>
                                    <button
                                        onClick={() => inputRef.current?.click()}
                                        className="w-full bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20"
                                    >
                                        Choose File
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div
                                    className="rounded-xl overflow-hidden border border-white/20 shadow-xl animate-fade-in">
                                    <img src={tempPreviewUrl} alt="Preview"
                                         className="w-full max-h-80 object-contain bg-black/60"/>
                                </div>
                                <p className="text-center text-white text-sm font-medium">Use this image for
                                    attendance?</p>
                                <div className="flex gap-3">
                                    <button onClick={handleCancelUpload} disabled={isLoading}
                                            className="flex-1 bg-white/8 hover:bg-white/15 active:scale-95 border border-white/20 text-white font-medium px-5 py-3 rounded-xl transition-all duration-200 disabled:opacity-50">
                                        Retake
                                    </button>
                                    <button onClick={handleConfirmUpload} disabled={isLoading}
                                            className="flex-1 bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-white font-semibold px-5 py-3 rounded-xl transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20">
                                        {isLoading &&
                                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg"
                                                 fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10"
                                                        stroke="currentColor" strokeWidth="4"/>
                                                <path className="opacity-75" fill="currentColor"
                                                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                                            </svg>}
                                        {isLoading ? "Uploading…" : "Confirm"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {showImageViewer && viewerImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className={`absolute inset-0 bg-black/80 ${isClosingImageViewer ? "animate-blur-out" : "animate-blur-in"}`}
                        onClick={closeImageViewer}/>
                    <div
                        className={`relative z-50 w-full max-w-5xl ${isClosingImageViewer ? 'animate-fade-out' : 'animate-fade-in'}`}>
                        <div
                            className="backdrop-blur-2xl bg-black/70 border border-white/15 rounded-3xl p-4 md:p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-base md:text-xl font-semibold text-white truncate pr-4">{viewerImage.title}</h3>
                                <button onClick={closeImageViewer}
                                        className="text-gray-400 hover:text-white hover:rotate-90 active:scale-90 transition-all duration-300 flex-shrink-0 p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2"
                                         viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                                    </svg>
                                </button>
                            </div>
                            <div
                                className="rounded-xl overflow-hidden border border-white/15 bg-black/60 relative select-none"
                                ref={imageContainerRef}
                                onWheel={handleWheel}
                                onTouchStart={handleTouchStart}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                style={{
                                    cursor: imageZoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default',
                                    touchAction: 'none'
                                }}
                            >
                                <img
                                    src={viewerMode === "processed" ? viewerImage.processedUrl : viewerImage.originalUrl}
                                    alt={viewerImage.title}
                                    className="w-full max-h-[65vh] md:max-h-[72vh] object-contain"
                                    key={viewerMode}
                                    style={{
                                        transform: `scale(${imageZoom}) translate(${imagePan.x / imageZoom}px, ${imagePan.y / imageZoom}px)`,
                                        transformOrigin: 'center',
                                        transition: isTapZooming ? 'transform 0.35s cubic-bezier(0.16,1,0.3,1)' : 'none'
                                    }}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    draggable={false}
                                />
                                {/* Controls overlay */}
                                <div
                                    className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
                                    {viewerImage.processedUrl && (
                                        <div
                                            className="relative bg-black/75 backdrop-blur-md rounded-full p-1 border border-white/15">
                                            <div className="flex relative">
                                                <div
                                                    className={`absolute inset-1 w-[calc(50%-2px)] rounded-full bg-cyan-500 toggle-indicator ${viewerMode === "processed" ? "translate-x-full" : "translate-x-0"}`}/>
                                                <button onClick={() => setViewerMode("original")}
                                                        className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-300 min-w-[84px] ${viewerMode === "original" ? "text-white" : "text-gray-400"}`}>Original
                                                </button>
                                                <button onClick={() => setViewerMode("processed")}
                                                        className={`relative z-10 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-300 min-w-[84px] ${viewerMode === "processed" ? "text-white" : "text-gray-400"}`}>Processed
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div
                                        className="flex items-center gap-2 bg-black/75 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/15">
                                        <button onClick={handleZoomOut} disabled={imageZoom <= 1}
                                                className="text-white hover:text-cyan-400 active:scale-90 transition-all disabled:opacity-30">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"/>
                                            </svg>
                                        </button>
                                        <span
                                            className="text-white text-xs font-medium min-w-[2.5rem] text-center">{Math.round(imageZoom * 100)}%</span>
                                        <button onClick={handleZoomIn} disabled={imageZoom >= 5}
                                                className="text-white hover:text-cyan-400 active:scale-90 transition-all disabled:opacity-30">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                                            </svg>
                                        </button>
                                        <button onClick={handleResetZoom}
                                                className="text-white hover:text-cyan-400 active:scale-90 transition-all ml-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round"
                                                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-center mt-2 text-xs text-gray-500">Double-tap or pinch to zoom · Drag to
                                pan</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative z-20 px-5 py-4 bg-gradient-to-b from-black/40 to-transparent backdrop-blur-2xl">
                <div className="max-w-7xl mx-auto flex items-center gap-3">
                    <img src="/logo.png" alt="SchoolSight logo" className="h-11 w-auto object-contain"/>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight">SchoolSight</h1>
                        <p className="text-gray-400 text-xs sm:text-sm leading-tight">Attendance Management System</p>
                    </div>
                </div>
            </div>

            <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-8">
                <div className="lg:hidden flex gap-3 overflow-x-auto stat-strip pb-1 mb-5">
                    {[
                        {label: "Total Uploads", value: uploads.length, accent: "text-cyan-400"},
                        {label: "Students", value: students.length, accent: "text-cyan-400"},
                        {
                            label: "Avg Attendance",
                            value: avgRate !== null ? `${avgRate}%` : "—",
                            accent: avgRate >= 70 ? "text-emerald-400" : avgRate >= 40 ? "text-amber-400" : "text-red-400"
                        },
                        {
                            label: "Last Upload",
                            value: uploads[0] ? formatDateInWords(uploads[0].uploadedAt) : "—",
                            accent: "text-gray-200",
                            small: true
                        },
                    ].map(({label, value, accent, small}) => (
                        <div key={label}
                             className="flex-shrink-0 bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 min-w-[120px]">
                            <div className="text-xs text-gray-500 mb-1 whitespace-nowrap">{label}</div>
                            <div
                                className={`font-bold ${small ? "text-sm" : "text-2xl"} ${accent} leading-tight`}>{value}</div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col lg:flex-row gap-5">
                    <div className="hidden lg:flex flex-col gap-4 w-56 flex-shrink-0">
                        {[
                            {label: "Total Uploads", value: uploads.length},
                            {label: "Students", value: students.length},
                            {
                                label: "Avg Attendance", value: avgRate !== null ? `${avgRate}%` : "—",
                                accent: avgRate >= 70 ? "text-emerald-400" : avgRate >= 40 ? "text-amber-400" : "text-red-400"
                            },
                        ].map(({label, value, accent}) => (
                            <GlassCard key={label} className="p-5">
                                <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">{label}</div>
                                <div className={`text-4xl font-bold ${accent || "text-cyan-400"}`}>{value}</div>
                            </GlassCard>
                        ))}
                        <GlassCard className="p-5">
                            <div className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Last Upload</div>
                            <div className="text-base font-semibold text-white mt-1 leading-snug">
                                {uploads[0] ? formatDateInWords(uploads[0].uploadedAt) : "—"}
                            </div>
                        </GlassCard>
                    </div>
                    <div className="flex-1 min-w-0">
                        <GlassCard className="p-5 sm:p-6">
                            <div className="flex items-center gap-2 mb-5 min-h-[2rem]">
                                {selectedUpload ? (
                                    <>
                                        <button onClick={handleBackToList}
                                                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white active:scale-95 transition-all duration-200 py-1 pr-3 -ml-1 rounded-lg hover:bg-white/8">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
                                                 viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                                            </svg>
                                            History
                                        </button>
                                        <span className="text-gray-600">/</span>
                                        <span
                                            className="text-sm text-white font-medium truncate">{formatDateInWords(selectedUpload.uploadedAt)}</span>
                                    </>
                                ) : (
                                    <h2 className="text-2xl font-bold text-white tracking-tight">Upload History</h2>
                                )}
                            </div>
                            {!selectedUpload && (
                                <div className={!isClosingDetails ? "animate-slide-in-left" : ""}>
                                    {loading && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {[1, 2, 3, 4, 5, 6].map(i => (
                                                <div key={i}
                                                     className="p-5 rounded-xl bg-white/5 border-l-4 border-l-white/10 border border-white/10 ghost-shimmer">
                                                    <div className="flex justify-between mb-3">
                                                        <div>
                                                            <div className="h-5 bg-white/10 rounded w-28 mb-2"/>
                                                            <div className="h-3 bg-white/10 rounded w-20"/>
                                                        </div>
                                                        <div className="h-8 w-10 bg-white/10 rounded"/>
                                                    </div>
                                                    <div className="h-5 bg-white/10 rounded w-16"/>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {!loading && uploads.length === 0 && (
                                        <div className="text-center py-20 animate-fade-in">
                                            <div
                                                className="bg-cyan-500/10 border border-cyan-500/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor"
                                                     strokeWidth="1.5" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round"
                                                          d="M3 7h2l2-3h10l2 3h2a2 2 0 012 2v10a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z"/>
                                                    <circle cx="12" cy="13" r="4"/>
                                                </svg>
                                            </div>
                                            <p className="text-white font-semibold text-lg">No uploads yet</p>
                                            <p className="text-gray-500 text-sm mt-1">Tap the Upload button to get
                                                started</p>
                                        </div>
                                    )}
                                    {!loading && uploads.length > 0 && (
                                        <div
                                            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[78vh] overflow-auto custom-scroll pr-1">
                                            {uploads.map(u => {
                                                const isProcessed = u.status === "processed";
                                                const present = isProcessed ? getPresentCountForUpload(u) : 0;
                                                const total = isProcessed ? (students.length || 15) : 0;
                                                const borderCls = isProcessed
                                                    ? getAttendanceBorderColor(present, total)
                                                    : "border-l-white/20";

                                                const numColor = isProcessed
                                                    ? getAttendanceBadgeColor(present, total)
                                                    : "text-gray-400";
                                                return (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => setSelectedUpload(u)}
                                                        className={`text-left p-4 rounded-xl bg-white/5 border border-white/10 border-l-4 ${borderCls} hover:bg-white/10 hover:border-white/20 active:scale-[0.97] transition-all duration-200 group relative`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                            <div className="flex-1 min-w-0">
                                                                <div
                                                                    className="font-semibold text-white text-base leading-tight mb-0.5">{formatDateInWords(u.uploadedAt)}</div>
                                                                <div
                                                                    className="text-xs text-gray-500">{u.folder || "captured_images"}</div>
                                                            </div>
                                                            <div className="text-right flex-shrink-0">
                                                                <div
                                                                    className={`text-3xl font-bold leading-none ${numColor}`}>{present}</div>
                                                                <div
                                                                    className="text-xs text-gray-500 mt-0.5">/ {total} present
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div
                                                            className="w-full h-1 bg-white/10 rounded-full mb-3 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    (present / total) >= 0.7 ? "bg-emerald-500" :
                                                                        (present / total) >= 0.4 ? "bg-amber-400" : "bg-red-500"
                                                                }`}
                                                                style={{width: `${total === 0 ? 0 : Math.min((present / total) * 100, 100)}%`}}
                                                            />
                                                        </div>

                                                        <span
                                                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                u.status === "processed"
                                                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                            }`}>
                                                            {u.status || "pending"}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedUpload && (
                                <div
                                    className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${!isClosingDetails ? "animate-slide-in-right" : "animate-slide-out-right"}`}>
                                    <div>
                                        <div
                                            onClick={() => openImageViewer(selectedUpload.imageUrl, selectedUpload.processed_image_url || selectedUpload.processed_image, "Attendance Image")}
                                            className="rounded-xl overflow-hidden border border-white/15 mb-4 shadow-lg hover:border-cyan-500/50 active:scale-[0.98] transition-all duration-200 cursor-pointer group relative"
                                        >
                                            <img
                                                src={selectedUpload.processed_image_url || selectedUpload.processed_image || selectedUpload.imageUrl}
                                                alt="processed"
                                                className="w-full h-52 sm:h-64 object-contain bg-black/70"
                                                onError={(e) => {
                                                    e.currentTarget.src = selectedUpload.imageUrl || "";
                                                }}
                                            />
                                            <div
                                                className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                                                <div
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 backdrop-blur-sm rounded-full p-3">
                                                    <svg className="w-7 h-7 text-white" fill="none"
                                                         stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round"
                                                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div
                                            className="space-y-0 text-sm bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                            <div
                                                className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                                                <span className="text-gray-400">Status</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                                    selectedUpload.status === "processed"
                                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                        : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                                }`}>{selectedUpload.status || "pending"}</span>
                                            </div>
                                            <div
                                                className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                                                <span className="text-gray-400">Uploaded</span>
                                                <span
                                                    className="text-white font-mono text-xs">{formatDate(selectedUpload.uploadedAt)}</span>
                                            </div>
                                            {selectedUpload.processed_at && (
                                                <div
                                                    className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                                                    <span className="text-gray-400">Processed</span>
                                                    <span
                                                        className="text-white font-mono text-xs">{formatDate(selectedUpload.processed_at)}</span>
                                                </div>
                                            )}
                                            {selectedUpload.headcount !== undefined && (
                                                <div className="flex items-center justify-between px-4 py-3">
                                                    <span className="text-gray-400">Headcount</span>
                                                    <span
                                                        className="text-cyan-400 font-bold text-lg">{selectedUpload.headcount}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col min-h-0">
                                        <h3 className="font-bold text-base text-white mb-3 flex items-center gap-2">
                                            Recognized Students
                                            {selectedUpload.status === "processed" && (() => {
                                                const {present, absent} = getSortedStudentList(selectedUpload);
                                                const total = present.length + absent.length;
                                                return total > 0
                                                    ? <span
                                                        className="text-xs font-normal text-gray-500">{present.length}/{total}</span>
                                                    : null;
                                            })()}
                                        </h3>

                                        <div className="flex-1 max-h-[55vh] overflow-auto custom-scroll space-y-2 pr-1">
                                            {selectedUpload.status !== "processed" ? (
                                                <div className="text-center py-14">
                                                    <div
                                                        className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-400 mx-auto mb-3"/>
                                                    <p className="text-sm text-gray-500">Processing image…</p>
                                                </div>
                                            ) : (() => {
                                                const {present, absent} = getSortedStudentList(selectedUpload);
                                                const total = present.length + absent.length;

                                                if (total === 0) return (
                                                    <p className="text-sm text-gray-500 text-center py-10">No
                                                        recognition data available</p>
                                                );

                                                const renderRow = (item, isPresent) => {
                                                    const name = item.name || item.id || "Unknown";
                                                    const cls = item.class || item._att?.class || "";
                                                    const score = item.score;
                                                    return (
                                                        <div key={item.id || item.name || Math.random()}
                                                             className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 active:scale-[0.98] transition-all duration-200">
                                                            <Avatar name={name}/>
                                                            <div className="flex-1 min-w-0">
                                                                <div
                                                                    className="font-semibold text-white text-sm leading-tight truncate">{name}</div>
                                                                <div
                                                                    className="text-xs text-gray-500">{cls}{score ? ` · ${Math.round(score * 100)}%` : ""}</div>
                                                            </div>
                                                            <div
                                                                className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${isPresent ? "bg-emerald-500/90 text-white" : "bg-red-500/90 text-white"}`}>
                                                                {isPresent ? "Present" : "Absent"}
                                                            </div>
                                                        </div>
                                                    );
                                                };

                                                return (
                                                    <>
                                                        {present.length > 0 && (
                                                            <>
                                                                <div
                                                                    className="text-xs text-gray-600 uppercase tracking-wider px-1 pt-1">Present
                                                                    · {present.length}</div>
                                                                {present.map(r => renderRow(r, true))}
                                                            </>
                                                        )}
                                                        {absent.length > 0 && (
                                                            <>
                                                                <div
                                                                    className="text-xs text-gray-600 uppercase tracking-wider px-1 pt-3">Absent
                                                                    · {absent.length}</div>
                                                                {absent.map(r => renderRow(r, false))}
                                                            </>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </GlassCard>
                    </div>
                </div>
            </div>

            {statusMessage && (
                <div
                    className={`fixed z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl flex items-center gap-3 backdrop-blur-xl animate-fade-in border ${
                        statusType === "success" ? "bg-emerald-950/90 text-emerald-300 border-emerald-500/30" :
                            statusType === "error" ? "bg-red-950/90 text-red-300 border-red-500/30" :
                                "bg-amber-950/90 text-amber-300 border-amber-500/30"
                    } bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2`}>
                    {statusType === "success" &&
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"
                             viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>}
                    {statusType === "error" &&
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"
                             viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round"
                                  d="M12 9v2m0 4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"/>
                        </svg>}
                    <span>{statusMessage}</span>
                </div>
            )}
        </div>
    );
}