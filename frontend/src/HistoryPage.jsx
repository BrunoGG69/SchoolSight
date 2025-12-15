import React, {useEffect, useState} from "react";
import {collection, getDocs, onSnapshot, orderBy, query} from "firebase/firestore";
import {db} from "./firebase";
import BlobBackground from "./components/BlobBackground.jsx";

function GlassCard({children, className = ""}) {
    return (
        <div className={`backdrop-blur-md bg-black/60 rounded-2xl p-4 shadow-2xl ${className}`}>
            {children}
        </div>
    );
}

const formatDate = (val) => {
    if (!val) return "—";
    try {
        if (val instanceof Date) return val.toLocaleString();
        return new Date(val).toLocaleString();
    } catch {
        return "—";
    }
};

const formatDateInWords = (val) => {
    if (!val) return "—";
    try {
        const date = val instanceof Date ? val : new Date(val);
        return date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
        }) + ", " + date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        });
    } catch {
        return "—";
    }
};

export default function HistoryPage() {
    const [uploads, setUploads] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedUpload, setSelectedUpload] = useState(null);
    const [loading, setLoading] = useState(true);

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
        const unsub = onSnapshot(
            q,
            (snap) => {
                const docs = [];
                snap.forEach((d) => docs.push({id: d.id, ...convertTimestamps(d.data())}));
                setUploads(docs);
                setLoading(false);
            },
            (err) => {
                console.error("uploads listener error", err);
                setLoading(false);
            }
        );

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
        if (typeof upload.headcount === "number") return upload.headcount;
        if (Array.isArray(upload.recognized)) return upload.recognized.filter((r) => r.present).length;

        if (students.length && (upload.imageUrl || upload.processed_image_url || upload.uploadedAt)) {
            const identifier = upload.imageUrl || upload.processed_image_url || upload.uploadedAt;
            let count = 0;
            students.forEach((s) => {
                const attendance = s.attendance;
                if (Array.isArray(attendance)) {
                    if (
                        attendance.some(
                            (a) =>
                                a.image_url === identifier ||
                                a.processed_image_url === identifier ||
                                a.timestamp === upload.uploadedAt
                        )
                    )
                        count++;
                }
            });
            return count;
        }
        return 0;
    };

    return (
        <div className="min-h-screen bg-black relative overflow-hidden text-white p-6">
            <BlobBackground/>
            <div className="relative z-20 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-gray-200">---------</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Upload list */}
                    <GlassCard className="md:col-span-1">
                        <h3 className="text-lg font-medium mb-3">Uploads</h3>
                        {loading && <p className="text-sm text-gray-300">Loading...</p>}
                        {!loading && uploads.length === 0 && <p className="text-sm text-gray-300">No uploads yet.</p>}

                        <div className="flex flex-col gap-3 max-h-[60vh] overflow-auto pr-2">
                            {uploads.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => setSelectedUpload(u)}
                                    className="text-left p-3 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-semibold">{formatDateInWords(u.uploadedAt)}</div>
                                            <div className="text-xs text-gray-300">
                                                {u.folder || "captured_images"}
                                            </div>
                                        </div>
                                        <div className="text-sm text-gray-200">{getPresentCountForUpload(u)} present
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </GlassCard>

                    {/* Upload details */}
                    <GlassCard className="md:col-span-2">
                        {!selectedUpload ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <p className="text-gray-300 md:text-2xl text-sm text-center">Select an upload on the left to see details and recognized
                                    students.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Upload details</h3>
                                    <div className="text-sm text-gray-300 mb-3">ID: {selectedUpload.id}</div>

                                    <div className="rounded-lg overflow-hidden border border-white/6">
                                        <img
                                            src={selectedUpload.processed_image_url || selectedUpload.processed_image || selectedUpload.imageUrl}
                                            alt="processed"
                                            className="w-full h-64 object-contain bg-black"
                                            onError={(e) => {
                                                e.currentTarget.src = selectedUpload.imageUrl || "";
                                            }}
                                        />
                                    </div>

                                    <div className="mt-3 text-md text-gray-200 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <strong>Status:</strong>
                                            <span
                                                className={`px-3 py-1 rounded-full text-sm font-medium backdrop-blur-md border ${selectedUpload.status === "processed"
                                                    ? "bg-green-500/20 text-green-300 border-green-300/30"
                                                    : selectedUpload.status === "pending"
                                                        ? "bg-yellow-500/20 text-yellow-300 border-yellow-300/30"
                                                        : "bg-gray-500/20 text-gray-300 border-gray-300/30"
                                                }`}
                                            >
      {selectedUpload.status || "pending"}
    </span>
                                        </div>

                                        {selectedUpload.processed_at && (
                                            <div>
                                                <strong>Processed
                                                    at:</strong> {formatDateInWords(selectedUpload.processed_at)}
                                            </div>
                                        )}

                                        <div>
                                            <strong>Uploaded:</strong> {formatDateInWords(selectedUpload.uploadedAt)}
                                        </div>

                                        {selectedUpload.headcount !== undefined && (
                                            <div>
                                                <strong>Headcount:</strong> {selectedUpload.headcount}
                                            </div>
                                        )}

                                        <div className="flex flex-wrap gap-3 pt-2">
                                            {selectedUpload.imageUrl && (
                                                <a
                                                    className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20
                   text-sm text-white hover:bg-white/20 transition-colors"
                                                    href={selectedUpload.imageUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Open Original Image
                                                </a>
                                            )}

                                            {selectedUpload.processed_image_url && (
                                                <a
                                                    className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20
                   text-sm text-white hover:bg-white/20 transition-colors"
                                                    href={selectedUpload.processed_image_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Open Processed Image
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2">Recognized students</h3>
                                    <div className="max-h-[60vh] overflow-auto space-y-2">
                                        {selectedUpload.status !== "processed" ? (
                                            <p className="text-sm text-gray-400 italic">Processing Pending...</p>
                                        ) : (
                                            <>
                                                {Array.isArray(selectedUpload.recognized) &&
                                                selectedUpload.recognized.length > 0 ? (
                                                    selectedUpload.recognized.map((r, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-center justify-between p-2 rounded-lg bg-white/3"
                                                        >
                                                            <div>
                                                                <div
                                                                    className="font-medium">{r.name || r.id || "Unknown"}</div>
                                                                <div className="text-xs text-gray-300">
                                                                    {r.class || ""} • {r.score ? `score: ${r.score}` : ""}
                                                                </div>
                                                            </div>
                                                            <div
                                                                className={`px-2 py-1 rounded-full text-sm ${
                                                                    r.present ? "bg-green-600" : "bg-red-600"
                                                                }`}
                                                            >
                                                                {r.present ? "Present" : "Unknown"}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-gray-300"></p>
                                                )}

                                                {!Array.isArray(selectedUpload.recognized) && (
                                                    <div>
                                                        {students.length === 0 && (
                                                            <p className="text-sm text-gray-300">No student data
                                                                available.</p>
                                                        )}
                                                        {students.map((s) => {
                                                            const att = Array.isArray(s.attendance)
                                                                ? s.attendance.find(
                                                                    (a) =>
                                                                        a.image_url === selectedUpload.imageUrl ||
                                                                        a.processed_image_url === selectedUpload.processed_image_url ||
                                                                        a.timestamp === selectedUpload.uploadedAt
                                                                )
                                                                : null;
                                                            return (
                                                                <div
                                                                    key={s.id}
                                                                    className="flex items-center justify-between p-2 rounded-lg bg-white/3 mb-2"
                                                                >
                                                                    <div>
                                                                        <div
                                                                            className="font-medium">{s.name || s.id}</div>
                                                                        <div
                                                                            className="text-xs text-gray-300">{s.class || ""}</div>
                                                                        {att && (
                                                                            <div className="text-xs text-gray-400">
                                                                                Recorded: {formatDate(att.timestamp || att.processed_at || att.uploadedAt)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div
                                                                        className={`px-2 py-1 rounded-full text-sm ${
                                                                            att && att.present ? "bg-green-600" : "bg-red-600"
                                                                        }`}
                                                                    >
                                                                        {att && att.present ? "Present" : "Absent"}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                            </div>
                        )}
                    </GlassCard>
                </div>

                {/* Summary */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <GlassCard>
                        <h4 className="font-semibold">Total uploads</h4>
                        <p className="text-2xl mt-2">{uploads.length}</p>
                    </GlassCard>

                    <GlassCard>
                        <h4 className="font-semibold">Students Enrolled</h4>
                        <p className="text-2xl mt-2">{students.length}</p>
                    </GlassCard>

                    <GlassCard>
                        <h4 className="font-semibold">Last processed</h4>
                        <p className="text-2xl mt-2">{uploads[0] ? formatDate(uploads[0].uploadedAt) : '—'}</p>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
