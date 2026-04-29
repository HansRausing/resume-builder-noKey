import axios from "axios";
import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { downloadPDF } from "./utils/downloadPdf";

function App() {
  const [currentResume, setCurrentResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tailoredResume, setTailoredResume] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [flowCvEmail, setFlowCvEmail] = useState("");
  const [flowCvPassword, setFlowCvPassword] = useState("");
  const [flowCvConnected, setFlowCvConnected] = useState(false);
  const [flowCvSessionEmail, setFlowCvSessionEmail] = useState("");
  const [flowCvResumeId, setFlowCvResumeId] = useState("");
  const [flowCvAuthLoading, setFlowCvAuthLoading] = useState(false);
  const [flowCvAuthError, setFlowCvAuthError] = useState("");

  const LOCAL_STORAGE_FLOWCV_SESSION = "rb_flowcv_session";

  const saveFlowCvSessionToLocalStorage = useCallback((data) => {
    if (typeof window === "undefined") return;
    try {
      if (data?.connected) {
        window.localStorage.setItem(
          LOCAL_STORAGE_FLOWCV_SESSION,
          JSON.stringify({
            email: data.email || "",
            resumeId: data.resumeId || "",
          }),
        );
      } else {
        window.localStorage.removeItem(LOCAL_STORAGE_FLOWCV_SESSION);
      }
    } catch {
      /* ignore localStorage failures */
    }
  }, []);

  const loadFlowCvSessionFromLocalStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_FLOWCV_SESSION);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed?.email) setFlowCvSessionEmail(parsed.email);
      if (parsed?.resumeId) setFlowCvResumeId(parsed.resumeId);
    } catch {
      /* ignore invalid localStorage */
    }
  }, []);

  const clearFlowCvSessionFromLocalStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(LOCAL_STORAGE_FLOWCV_SESSION);
    } catch {
      /* ignore */
    }
  }, []);

  const loadFlowCvSessionStatus = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/flowcv/session", {
        withCredentials: true,
      });
      setFlowCvConnected(Boolean(data?.connected));
      setFlowCvSessionEmail(data?.email || "");
      setFlowCvResumeId(data?.resumeId || "");
      saveFlowCvSessionToLocalStorage(data);
    } catch {
      setFlowCvConnected(false);
      setFlowCvSessionEmail("");
      setFlowCvResumeId("");
      clearFlowCvSessionFromLocalStorage();
    }
  }, [saveFlowCvSessionToLocalStorage, clearFlowCvSessionFromLocalStorage]);

  useEffect(() => {
    loadFlowCvSessionFromLocalStorage();
    loadFlowCvSessionStatus();
  }, [loadFlowCvSessionFromLocalStorage, loadFlowCvSessionStatus]);

  const handleFlowCvLogin = async () => {
    if (!flowCvEmail.trim() || !flowCvPassword) {
      setFlowCvAuthError("Enter the email and password you use on app.flowcv.com");
      return;
    }
    setFlowCvAuthLoading(true);
    setFlowCvAuthError("");
    try {
      await axios.post(
        "/api/flowcv/login",
        {
          email: flowCvEmail.trim(),
          password: flowCvPassword,
        },
        { withCredentials: true },
      );
      setFlowCvPassword("");
      await loadFlowCvSessionStatus();
    } catch (err) {
      setFlowCvAuthError(
        err.response?.data?.details ||
          err.response?.data?.error ||
          "FlowCV sign-in failed",
      );
    } finally {
      setFlowCvAuthLoading(false);
    }
  };

  const handleFlowCvLogout = async () => {
    setFlowCvAuthLoading(true);
    setFlowCvAuthError("");
    try {
      await axios.post("/api/flowcv/logout", {}, { withCredentials: true });
      await loadFlowCvSessionStatus();
    } catch (err) {
      setFlowCvAuthError(
        err.response?.data?.error || "Could not sign out of FlowCV",
      );
    } finally {
      setFlowCvAuthLoading(false);
    }
  };

  // Convert @@text@@ to HTML bold tags
  const formatResumeWithBold = (text) => {
    return text.replace(/\@\@(.*?)\@\@/g, "<strong>$1</strong>");
  };

  const base64ToUint8Array = (base64) => {
    const clean = String(base64 || "").trim();
    if (!clean) return new Uint8Array();
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

  const sanitizeDownloadName = (name, fallback) => {
    let s = String(name || "");
    if (!s) s = String(fallback || "flowcv-resume.pdf");
    // Windows-illegal chars + control chars
    s = s.replace(/[\\/:*?"<>|\x00-\x1F]/g, "_").replace(/\s+/g, " ");
    if (!s.toLowerCase().endsWith(".pdf")) s += ".pdf";
    return s;
  };

  const downloadFlowCvPdfFromApi = useCallback(
    async (fileNameHint) => {
      const fileName = sanitizeDownloadName(
        fileNameHint,
        "flowcv-resume.pdf",
      );
      const res = await axios.get("/api/flowcv/download-pdf", {
        params: {
          previewPageCount: 2,
          filename: fileName,
          ...(flowCvResumeId.trim() ? { resumeId: flowCvResumeId.trim() } : {}),
        },
        responseType: "arraybuffer",
        withCredentials: true,
      });
      downloadPDF(res.data, fileName);
    },
    [flowCvResumeId],
  );

  const handleSyncResume = async () => {
    if (!currentResume.trim()) {
      setError("Please provide your resume text");
      return;
    }

    setLoading(true);
    setError("");
    setTailoredResume(currentResume);
    setResumeFileName("");

    try {
      const response = await axios.post(
        "/api/sync-resume",
        {
          currentResume,
        },
        { withCredentials: true },
      );

      setTailoredResume(response.data.tailoredResume);
      setResumeFileName(
        response.data?.tailoredResumeJson?.resumeFileName || "",
      );

      const nameHint = response.data?.tailoredResumeJson?.resumeFileName || "";
      const pdfBase64 = response.data?.flowCvSync?.pdfBase64;
      if (pdfBase64) {
        const fileName = sanitizeDownloadName(nameHint, "flowcv-resume.pdf");
        const bytes = base64ToUint8Array(pdfBase64);
        downloadPDF(bytes, fileName);
      } else if (flowCvConnected || flowCvResumeId.trim()) {
        try {
          await downloadFlowCvPdfFromApi(nameHint);
        } catch (dlErr) {
          console.error("FlowCV PDF after sync:", dlErr);
          setError(
            dlErr.response?.data?.details ||
              dlErr.response?.data?.error ||
              "Resume was synced but the PDF could not be downloaded. Use the Download PDF button to try again.",
          );
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.details ||
          err.response?.data?.error ||
          "Failed to sync resume to FlowCV",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setLoading(true);
    setError("");

    try {
      await downloadFlowCvPdfFromApi(resumeFileName);
    } catch (err) {
      console.error("FlowCV download error:", err);
      setError(
        err.response?.data?.error || "Failed to download PDF from FlowCV.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>🎯 Resume Sync</h1>
          <p>
            Sync your resume directly to FlowCV and download as PDF
          </p>
          <p className="header-subtitle">
            Sign in to FlowCV, paste your resume, and click Sync
          </p>
        </header>

        <div className="input-section">
          <div className="flowcv-auth-card">
            <h2 className="flowcv-auth-title">FlowCV account</h2>
            <p className="flowcv-auth-intro">
              Sign in with the same email and password as{" "}
              <a
                href="https://app.flowcv.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                app.flowcv.com
              </a>{" "}
              so tailored resumes can sync and export as PDF. Your password is
              sent to this app&apos;s server only to obtain a FlowCV session cookie;
              it is not stored on disk.
            </p>
            <div
              className={`flowcv-status ${flowCvConnected ? "flowcv-status--ok" : "flowcv-status--off"}`}
            >
              {flowCvConnected
                ? `Connected${flowCvSessionEmail ? ` as ${flowCvSessionEmail}` : ""}${flowCvResumeId ? ` · Resume ${flowCvResumeId}` : ""}`
                : "Not connected — PDF sync and download need a FlowCV session"}
            </div>
            {flowCvAuthError && (
              <div className="flowcv-auth-error">{flowCvAuthError}</div>
            )}
            {!flowCvConnected ? (
              <>
                <div className="input-group flowcv-auth-fields">
                  <label htmlFor="flowCvEmail">
                    <span className="label-text">FlowCV email</span>
                  </label>
                  <input
                    id="flowCvEmail"
                    type="email"
                    autoComplete="username"
                    className="input-field"
                    value={flowCvEmail}
                    onChange={(e) => setFlowCvEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="input-group flowcv-auth-fields">
                  <label htmlFor="flowCvPassword">
                    <span className="label-text">FlowCV password</span>
                  </label>
                  <input
                    id="flowCvPassword"
                    type="password"
                    autoComplete="current-password"
                    className="input-field"
                    value={flowCvPassword}
                    onChange={(e) => setFlowCvPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-flowcv"
                  disabled={flowCvAuthLoading}
                  onClick={handleFlowCvLogin}
                >
                  {flowCvAuthLoading ? "Signing in…" : "Sign in to FlowCV"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={flowCvAuthLoading}
                onClick={handleFlowCvLogout}
              >
                {flowCvAuthLoading ? "…" : "Sign out of FlowCV"}
              </button>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="currentResume">
              <span className="label-text">Your Updated Resume</span>
              <span className="label-hint">
                Paste your completed resume with all experiences and achievements
              </span>
            </label>
            <textarea
              id="currentResume"
              placeholder="Paste your updated resume here..."
              value={currentResume}
              onChange={(e) => setCurrentResume(e.target.value)}
              rows={12}
              className="textarea-field"
            />
          </div>

          <button
            onClick={handleSyncResume}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "⏳ Syncing to FlowCV..." : "✨ Sync to FlowCV"}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {tailoredResume && (
          <div className="result-section">
            <div className="result-header">
              <h2>📄 Your Resume</h2>
              <div className="result-info">
                <span className="info-badge">
                  ✨ Synced to FlowCV
                </span>
              </div>
              {/* <div className="result-actions">
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  disabled={loading}
                  className="btn btn-success"
                >
                  {loading ? "⏳ Generating PDF..." : "📥 Download PDF"}
                </button>
              </div> */}
            </div>
            <div className="result-content">
              <pre
                dangerouslySetInnerHTML={{
                  __html: formatResumeWithBold(tailoredResume),
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;