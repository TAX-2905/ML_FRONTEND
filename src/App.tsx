import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./App.css";

// --- CONFIGURATION (Replace with your keys!) ---
const SUPABASE_URL = "https://rfwdysubyqxfbinjynlg.supabase.co";
const SUPABASE_KEY = "sb_publishable_PSZfPtc_LeglQUDdXSAxLw_n9yHHhdF";

// Initialize Supabase Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- ICONS (SVG) ---
const ShieldIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const AlertIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);
const CheckIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
);
const ChevronDown = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
);
const ChevronUp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
);
const SunIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
);
const MoonIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
);
const FlagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
);

type Result = {
  label: "toxic" | "safe";
  score: number;
  explanation?: string | null;
};

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [reported, setReported] = useState(false);
  
  // NEW: Store the ID of the current database log
  const [logId, setLogId] = useState<number | null>(null);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setShowExplanation(false);
    setReported(false);
    setLogId(null); // Reset Log ID

    try {
      // 1. Get Prediction from Python API
      const res = await fetch("https://tax290503-kreol-toxicity-app.hf.space/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setResult(data);

      // 2. LOG TO SUPABASE IMMEDIATELY
      const { data: dbData, error } = await supabase
        .from("toxicity_logs")
        .insert([
          {
            query_text: text,
            is_toxic: data.label === "toxic",
            score: data.score,
            reported_mistake: false,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error("Supabase Error:", error);
      } else if (dbData) {
        // Save the ID so we can update it later if user reports it
        setLogId(dbData.id);
        console.log("Logged to DB with ID:", dbData.id);
      }

    } catch (error) {
      console.error("Connection error:", error);
      alert("Could not connect to Python! Is api.py running?");
    }
    setLoading(false);
  };

  const handleReport = async () => {
    // UI Update
    setReported(true);

    // Database Update
    if (logId) {
      const { error } = await supabase
        .from("toxicity_logs")
        .update({ reported_mistake: true })
        .eq("id", logId);

      if (error) console.error("Failed to report:", error);
      else console.log("Reported mistake for Log ID:", logId);
    }
  };

  const clear = () => {
    setText("");
    setResult(null);
    setLoading(false);
    setShowExplanation(false);
    setReported(false);
    setLogId(null);
  };

  const isToxic = result?.label === "toxic";

  return (
    <div className="page">
      <button 
        className="theme-toggle"
        onClick={() => setDarkMode(!darkMode)}
        title="Switch Theme"
      >
        {darkMode ? <SunIcon /> : <MoonIcon />}
      </button>

      <div className="card">
        <div className="header">
          <div className="title">
            <span style={{ color: "var(--primary)" }}><ShieldIcon /></span>
            <span>MorisGuard V2</span>
          </div>
          <p className="subtitle">
            Hybrid AI Toxicity Detection for Mauritian Creole & Mixed Languages
          </p>
        </div>

        <div className="input-group">
          <textarea
            placeholder="Type a comment to analyze... (e.g. 'To enn gopia')"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setResult(null);
            }}
            className="textarea"
          />
        </div>

        <div className="buttonRow">
          <button
            onClick={analyze}
            disabled={loading || !text.trim()}
            className="button analyze-btn"
          >
            {loading ? "Analyzing..." : <><SearchIcon /> Check Text</>}
          </button>

          <button
            onClick={clear}
            disabled={!text && !result}
            className="button clear-btn"
          >
            Clear
          </button>
        </div>

        {result && (
          <div className="result-card">
            <div className={`result-header ${isToxic ? "status-toxic" : "status-safe"}`}>
              <span className={isToxic ? "blink-effect" : ""}>
                {isToxic ? <AlertIcon /> : <CheckIcon />}
              </span>
              <span className={isToxic ? "blink-effect" : ""}>
                {isToxic ? "Toxic Content Detected" : "Safe Content Verified"}
              </span>
            </div>

            {result.explanation && (
              <div className="ai-section">
                <button 
                  className="toggle-btn"
                  onClick={() => setShowExplanation(!showExplanation)}
                >
                  <span>Why is this {isToxic ? "toxic" : "safe"}?</span>
                  {showExplanation ? <ChevronUp /> : <ChevronDown />}
                </button>

                {showExplanation && (
                  <div className="analysis-content">
                    {result.explanation}
                  </div>
                )}
              </div>
            )}
            
            <div className="report-footer">
              {!reported ? (
                <button className="report-btn" onClick={handleReport}>
                  <FlagIcon /> Report mistake (False {isToxic ? "Positive" : "Negative"})
                </button>
              ) : (
                <span className="report-success">
                   ✓ Thanks! We will review this.
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}