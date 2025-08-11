import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDocs } from "firebase/firestore";
import { db } from "./firebase"; // adjust path if needed
import Blob from "./components/blobs";

// Glass-card component for reuse
function GlassCard({ children, className = "" }) {
  return (
    <div
      className={`backdrop-blur-md bg-white/6 border border-white/6 rounded-2xl p-4 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

export default function HistoryPage() {
  const [uploads, setUploads] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedUpload, setSelectedUpload] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // realtime listener for `uploads` collection ordered by uploadedAt desc
    const q = query(collection(db, "uploads"), orderBy("uploadedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs = [];
      snap.forEach((d) => docs.push({ id: d.id, ...d.data() }));
      setUploads(docs);
      setLoading(false);
    }, (err) => {
      console.error("uploads listener error", err);
      setLoading(false);
    });

    // load students collection once (could also be realtime)
    const loadStudents = async () => {
      try {
        const sSnap = await getDocs(collection(db, "students"));
        const sDocs = [];
        sSnap.forEach((d) => sDocs.push({ id: d.id, ...d.data() }));
        setStudents(sDocs);
      } catch (e) {
        console.error("failed to load students", e);
      }
    };

    loadStudents();

    return () => unsub();
  }, []);

  // helper to compute presence count for an upload
  const getPresentCountForUpload = (upload) => {
    // Some uploads store a `headcount` or a nested array of recognized students; try to use fields defensively
    if (!upload) return 0;
    if (typeof upload.headcount === "number") return upload.headcount;

    // if upload contains a `results` / `recognized` array, count trues
    if (Array.isArray(upload.recognized)) return upload.recognized.filter(r => r.present).length;

    // fallback: check students state and see if their attendance array contains a matching uploaded image url or timestamp
    if (students.length && (upload.imageUrl || upload.processed_image_url || upload.uploadedAt)) {
      const identifier = upload.imageUrl || upload.processed_image_url || upload.uploadedAt;
      let count = 0;
      students.forEach((s) => {
        const attendance = s.attendance;
        if (Array.isArray(attendance)) {
          if (attendance.some(a => a.image_url === identifier || a.processed_image_url === identifier || a.timestamp === upload.uploadedAt)) count++;
        }
      });
      return count;
    }

    return 0;
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden text-white p-6">
      {/* Blob background - same blob cluster as your upload page for consistency */}
      <div className="absolute inset-0 pointer-events-none -translate-y-32">
        <Blob color="bg-purple-800" size="w-[45rem] h-[45rem]" position="-top-[10%] -left-[10%]" delay="animation-delay-1000" style={{ zIndex: 0 }} className="hidden md:block" />
        <Blob color="bg-purple-500" size="w-[45rem] h-[45rem]" position="-top-[22%] -right-[13%]" delay="animation-delay-2500" style={{ zIndex: 0 }} className="hidden md:block" />
        <Blob color="bg-indigo-400" size="w-[30rem] h-[30rem]" position="top-[10%] left-[22%]" delay="animation-delay-1200" style={{ zIndex: 1 }} className="hidden md:block" />
        <Blob color="bg-blue-400" size="w-[30rem] h-[30rem]" position="top-[6%] right-[28%]" delay="animation-delay-2200" style={{ zIndex: 1 }} className="hidden md:block" />
        <Blob color="bg-yellow-400" size="w-[36rem] h-[36rem]" position="absolute top-[28%] right-[30%] -translate-x-1/2 -translate-y-1/2" delay="animation-delay-1700" style={{ zIndex: 3 }} className="hidden md:block" />
        <Blob color="bg-red-500" size="w-[34rem] h-[34rem]" position="absolute top-[28%] right-[53%] -translate-x-1/2 -translate-y-1/2" delay="animation-delay-900" style={{ zIndex: 5 }} className="hidden md:block" />
        {/* mobile blobs */}
        <Blob color="bg-red-500" size="w-[25rem] h-[25rem]" position="absolute top-4 left-4" delay="animation-delay-1700" style={{ zIndex: 5 }} className="block md:hidden" />
        <Blob color="bg-indigo-500" size="w-[25rem] h-[25rem]" position="absolute -bottom-1 -right-1" delay="animation-delay-900" style={{ zIndex: 5 }} className="block md:hidden" />
      </div>

      {/* Blur overlay for glassy look */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>

      <div className="relative z-20 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Attendance History</h1>
          <p className="text-sm text-gray-300">Shows processed uploads and recognized students</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Uploads list */}
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
                      <div className="font-semibold">{u.id}</div>
                      <div className="text-xs text-gray-300">{u.folder || "captured_images"} • {new Date(u.uploadedAt).toLocaleString?.() || u.uploadedAt}</div>
                    </div>
                    <div className="text-sm text-gray-200">{getPresentCountForUpload(u)} present</div>
                  </div>
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Upload detail / preview */}
          <GlassCard className="md:col-span-2">
            {!selectedUpload ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-300">Select an upload on the left to see details and recognized students.</p>
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
                      onError={(e) => { e.currentTarget.src = selectedUpload.imageUrl || ""; }}
                    />
                  </div>

                  <div className="mt-3 text-sm text-gray-300 space-y-1">
                    <div><strong>Status:</strong> {selectedUpload.status || "pending"}</div>
                    {selectedUpload.processed_at && <div><strong>Processed at:</strong> {selectedUpload.processed_at}</div>}
                    <div><strong>Uploaded:</strong> {new Date(selectedUpload.uploadedAt).toLocaleString?.()}</div>
                    {selectedUpload.headcount !== undefined && <div><strong>Headcount:</strong> {selectedUpload.headcount}</div>}
                    {selectedUpload.imageUrl && <div><a className="underline text-sm text-[#00D4FF]" href={selectedUpload.imageUrl} target="_blank" rel="noreferrer">Open original image</a></div>}
                    {selectedUpload.processed_image_url && <div><a className="underline text-sm text-[#00D4FF]" href={selectedUpload.processed_image_url} target="_blank" rel="noreferrer">Open processed image</a></div>}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Recognized students</h3>

                  <div className="max-h-80 overflow-auto space-y-2">
                    {/* Try to display recognized students in a few possible formats depending on how you store them */}

                    {/* 1) If the upload document contains a `recognized` or `results` array */}
                    {Array.isArray(selectedUpload.recognized) && selectedUpload.recognized.length > 0 && (
                      selectedUpload.recognized.map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-white/3">
                          <div>
                            <div className="font-medium">{r.name || r.id || "Unknown"}</div>
                            <div className="text-xs text-gray-300">{r.class || ''} • {r.score ? `score: ${r.score}` : ''}</div>
                          </div>
                          <div className={`px-2 py-1 rounded-full text-sm ${r.present ? 'bg-green-600' : 'bg-red-600'}`}>{r.present ? 'Present' : 'Unknown'}</div>
                        </div>
                      ))
                    )}

                    {/* 2) If student docs have `attendance` arrays, filter those that match this upload */}
                    {!Array.isArray(selectedUpload.recognized) && (
                      <div>
                        {students.length === 0 && <p className="text-sm text-gray-300">No student data available.</p>}
                        {students.map((s) => {
                          const att = Array.isArray(s.attendance) ? s.attendance.find(a => a.image_url === selectedUpload.imageUrl || a.processed_image_url === selectedUpload.processed_image_url || a.timestamp === selectedUpload.uploadedAt) : null;
                          return (
                            <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-white/3 mb-2">
                              <div>
                                <div className="font-medium">{s.name || s.id}</div>
                                <div className="text-xs text-gray-300">{s.class || ''}</div>
                                {att && <div className="text-xs text-gray-400">Recorded: {att.timestamp || att.processed_at || att.uploadedAt}</div>}
                              </div>
                              <div className={`px-2 py-1 rounded-full text-sm ${att && att.present ? 'bg-green-600' : 'bg-red-600'}`}>{att && att.present ? 'Present' : 'Absent'}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </div>

        {/* bottom summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard>
            <h4 className="font-semibold">Total uploads</h4>
            <p className="text-2xl mt-2">{uploads.length}</p>
          </GlassCard>

          <GlassCard>
            <h4 className="font-semibold">Students in DB</h4>
            <p className="text-2xl mt-2">{students.length}</p>
          </GlassCard>

          <GlassCard>
            <h4 className="font-semibold">Last processed</h4>
            <p className="text-2xl mt-2">{uploads[0] ? new Date(uploads[0].uploadedAt).toLocaleString() : '—'}</p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
