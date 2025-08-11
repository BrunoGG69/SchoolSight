import React, { useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import BlobBackground from "./components/BlobBackground.jsx";
import UploadBox from "./components/UploadBox.jsx";
import HistoryPage from "./HistoryPage.jsx";

function Navbar() {
  return (
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/30 backdrop-blur-md border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center text-white">
              <Link to="/" className="text-lg font-bold">SchoolSight</Link>
              <div className="flex gap-4">
                  <Link
                      to="/"
                      className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                  >
                      Home
                  </Link>
                  <Link
                      to="/history"
                      className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition-colors"
                  >
                      History
                  </Link>
              </div>
          </div>
      </nav>

  );
}

function App() {
    const [statusMessage, setStatusMessage] = useState("");
    const [statusType, setStatusType] = useState("info");
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    return (
        <BrowserRouter>
            <Navbar/>
            <Routes>
                {/* Home Page */}
                <Route
                    path="/"
                    element={
                        <div
                            className="bg-black min-h-screen flex items-center justify-center relative overflow-hidden">
                            <BlobBackground/>
                            <UploadBox
                                statusMessage={statusMessage}
                setStatusMessage={setStatusMessage}
                statusType={statusType}
                setStatusType={setStatusType}
                previewUrl={previewUrl}
                setPreviewUrl={setPreviewUrl}
                isDragging={isDragging}
                setIsDragging={setIsDragging}
                inputRef={inputRef}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            </div>
          }
        />

        {/* History Page */}
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
