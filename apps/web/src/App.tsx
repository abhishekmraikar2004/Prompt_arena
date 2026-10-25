import { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { remainingSeconds } from "./timing";

type Round = {
  roundId: string;
  status: string;
  target?: { imageUrl: string; altText: string };
  deadlineAt?: string;
  serverNow?: string;
};
type Result = {
  status: string;
  target?: { imageUrl: string; altText: string };
  prompt?: string;
  referencePrompt?: string;
  promptScore?: number;
  finalScore?: number;
  scoreMode?: string;
  attributes?: Array<{ label: string; judgment: string; reason: string }>;
  feedback?: string;
  message?: string;
};
const request = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const responseText = await response.text();
  let body: { error?: { message?: string } } | null = null;
  try {
    body = responseText ? JSON.parse(responseText) : null;
  } catch {
    body = null;
  }
  if (!response.ok)
    throw new Error(
      body?.error?.message ??
        (responseText
          ? `The API returned an error (${response.status}). Please try again.`
          : `The API returned an empty response (${response.status}). Check that the API and MongoDB are running.`),
    );
  if (!body)
    throw new Error(
      "The API returned an empty response. Check that the API and MongoDB are running.",
    );
  return body as T;
};

function Landing() {
  return (
    <main className="landing">
      <nav className="nav">
        <Link className="brand" to="/">
          PROMPT<span>ARENA</span>
        </Link>
        <Link to="/how-to-play" className="nav-link">
          How to play <span aria-hidden="true">↗</span>
        </Link>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="live-dot" /> A CREATIVE CHALLENGE
          </p>
          <h1>
            See it.
            <br />
            <em>Say it.</em>
          </h1>
          <p className="hero-text">
            One image. Sixty seconds. Describe what you see and find out how
            close your words can get.
          </p>
          <Link className="button primary" to="/play">
            Play a round <span aria-hidden="true">→</span>
          </Link>
          <p className="microcopy">
            No account needed · Voice or text · Just for fun
          </p>
        </div>
        <div className="hero-art">
          <img
            src="/targets/still-life.svg"
            alt="A blue ceramic vase holding yellow flowers beside a sunlit window"
          />
          <div className="art-label">
            <span>01 / VISUAL ROUND</span>
            <strong>Look closer.</strong>
          </div>
          <div className="time-stamp">
            00:60 <span>YOUR TIME</span>
          </div>
        </div>
      </section>
      <section className="how-strip">
        <div>
          <span className="step">01</span>
          <strong>Study the image</strong>
          <p>Take it all in. The clock starts when you’re ready.</p>
        </div>
        <div>
          <span className="step">02</span>
          <strong>Describe what you see</strong>
          <p>Speak or type. Your words stay editable.</p>
        </div>
        <div>
          <span className="step">03</span>
          <strong>See how you did</strong>
          <p>Get a score with details on what you caught.</p>
        </div>
      </section>
      <footer>
        <span>Prompt Arena</span>
        <span>AI scores are estimates, not exact truth.</span>
      </footer>
    </main>
  );
}

function HowToPlay() {
  return (
    <main className="page-shell">
      <nav className="nav">
        <Link className="brand" to="/">
          PROMPT<span>ARENA</span>
        </Link>
        <Link to="/" className="nav-link">
          ← Home
        </Link>
      </nav>
      <section className="info-card">
        <p className="eyebrow">THE RULES</p>
        <h1>
          Three steps.
          <br />
          <em>One minute.</em>
        </h1>
        <ol>
          <li>
            <b>Start when ready.</b> The server starts the clock after you press
            Start.
          </li>
          <li>
            <b>Describe the image.</b> Use voice where supported, or type. You
            can edit the transcript.
          </li>
          <li>
            <b>Submit before time runs out.</b> Your prompt score reflects
            visual details such as subject, setting, color, and composition.
          </li>
        </ol>
        <p>
          Scoring is an AI estimate, not a promise of pixel-perfect
          reproduction. English is the MVP language. Speech recognition depends
          on your browser and may use its vendor’s service. Raw audio is not
          uploaded by Prompt Arena.
        </p>
        <Link className="button primary" to="/play">
          Ready? Play <span>→</span>
        </Link>
      </section>
    </main>
  );
}

function Play() {
  const [round, setRound] = useState<Round | null>(null);
  const [prompt, setPrompt] = useState("");
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mic, setMic] = useState("");
  const [started, setStarted] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);
  const navigate = useNavigate();
  const roundCreationStarted = useRef(false);
  const recognition = useRef<{
    start: () => void;
    stop: () => void;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
  } | null>(null);
  useEffect(() => {
    if (roundCreationStarted.current) return;
    roundCreationStarted.current = true;
    request<Round>("/api/v1/rounds", {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
    })
      .then(setRound)
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!round?.deadlineAt || !started) return;
    const tick = () => {
      const remaining = remainingSeconds(
        round.deadlineAt!,
        Date.now(),
        serverOffset,
      );
      setSeconds(remaining);
      if (remaining === 0)
        setMic("Round ended. Any unsubmitted text was not sent for scoring.");
    };
    tick();
    const id = window.setInterval(tick, 200);
    return () => window.clearInterval(id);
  }, [round?.deadlineAt, serverOffset, started]);
  const start = async () => {
    if (!round) return;
    setBusy(true);
    try {
      const active = await request<Round>(
        `/api/v1/rounds/${round.roundId}/start`,
        { method: "POST" },
      );
      setServerOffset(Date.now() - new Date(active.serverNow!).getTime());
      setRound((prepared) =>
        prepared ? { ...prepared, ...active, target: prepared.target } : active,
      );
      setStarted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    const frozenPrompt = `${prompt}${interim ? `${prompt && !prompt.endsWith(" ") ? " " : ""}${interim}` : ""}`;
    if (!round || !frozenPrompt.trim() || seconds <= 0) return;
    setBusy(true);
    setError("");
    try {
      await request(`/api/v1/rounds/${round.roundId}/submit`, {
        method: "POST",
        body: JSON.stringify({ prompt: frozenPrompt }),
      });
      navigate(`/results/${round.roundId}`);
    } catch (e) {
      setError((e as Error).message);
      if ((e as Error).message.includes("ended")) setSeconds(0);
    } finally {
      setBusy(false);
    }
  };
  const toggleVoice = () => {
    const Recognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setMic(
        "Speech recognition is not supported in this browser. You can type instead.",
      );
      return;
    }
    if (recognition.current) {
      recognition.current.stop();
      recognition.current = null;
      if (interim) {
        setPrompt(
          (previous) =>
            `${previous}${previous && !previous.endsWith(" ") ? " " : ""}${interim}`,
        );
      }
      setInterim("");
      setMic("Microphone stopped.");
      return;
    }
    const rec = new Recognition();
    recognition.current = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    setMic("Requesting microphone access…");
    rec.onstart = () => setMic("Listening… speak clearly.");
    rec.onresult = (event: any) => {
      let finalText = "";
      let draftText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else draftText += text;
      }
      if (finalText)
        setPrompt(
          (previous) =>
            `${previous}${previous && !previous.endsWith(" ") ? " " : ""}${finalText}`,
        );
      setInterim(draftText);
    };
    rec.onerror = (event: any) => {
      setInterim("");
      setMic(
        event.error === "not-allowed"
          ? "Microphone permission was denied. You can type instead."
          : "Speech recognition had a problem. You can type instead.",
      );
    };
    rec.onend = () => {
      recognition.current = null;
      setInterim("");
    };
    try {
      rec.start();
    } catch {
      setMic("Could not start speech recognition. You can type instead.");
    }
  };
  useEffect(() => () => recognition.current?.stop(), []);
  const expired = seconds === 0;
  return (
    <main className="page-shell">
      <nav className="nav">
        <Link className="brand" to="/">
          PROMPT<span>ARENA</span>
        </Link>
        <div className="round-mark">
          ROUND 01 <i /> SOLO
        </div>
      </nav>
      {!round ? (
        <div className="loading-card">{error || "Preparing your image…"}</div>
      ) : (
        <section className="game-layout">
          <div className="target-panel">
            <div className="panel-head">
              <span>YOUR IMAGE</span>
              <span>LOOK CLOSELY</span>
            </div>
            {round.target && (
              <img
                className="target-image"
                src={round.target.imageUrl}
                alt={round.target.altText}
              />
            )}
            <p className="image-caption">
              Take in the details. What stands out?
            </p>
          </div>
          <div className="entry-panel">
            <div className="timer-row">
              <div>
                <span className="eyebrow">TIME LEFT</span>
                <div
                  className={`timer ${seconds <= 10 ? "urgent" : ""}`}
                  aria-live="off"
                >
                  {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                  {String(seconds % 60).padStart(2, "0")}
                </div>
              </div>
              <span className="timer-note">
                SERVER
                <br />
                TIMED
              </span>
            </div>
            {!started ? (
              <div className="start-box">
                <p>Ready to describe the image?</p>
                <button
                  className="button primary"
                  disabled={busy || !!error}
                  onClick={start}
                >
                  Start the 60-second round <span>→</span>
                </button>
              </div>
            ) : (
              <>
                <label htmlFor="prompt" className="field-label">
                  YOUR DESCRIPTION <span>{(prompt + interim).length}/2000</span>
                </label>
                <textarea
                  id="prompt"
                  maxLength={2000}
                  value={`${prompt}${interim ? `${prompt && !prompt.endsWith(" ") ? " " : ""}${interim}` : ""}`}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setInterim("");
                  }}
                  disabled={busy || expired}
                  placeholder="Describe the subject, colors, setting, and anything else you notice…"
                />
                <div className="input-actions">
                  <button
                    className="button voice"
                    onClick={toggleVoice}
                    disabled={expired || busy}
                  >
                    <span className="mic-icon">◉</span>{" "}
                    {recognition.current ? "Stop voice" : "Use voice"}
                  </button>
                  <span className="voice-hint">
                    Voice is optional. Type anytime.
                  </span>
                </div>
                <div className="privacy-note">
                  ⌁ &nbsp;Your transcript is editable. Audio isn’t stored by
                  Prompt Arena.
                </div>
                <button
                  className="button primary submit"
                  disabled={busy || expired || !(prompt + interim).trim()}
                  onClick={submit}
                >
                  {busy ? "Saving your prompt…" : "Submit description"}{" "}
                  <span>→</span>
                </button>
              </>
            )}
            {mic && (
              <p className="status-note" role="status">
                {mic}
              </p>
            )}
            {error && (
              <p className="error-note" role="alert">
                {error}
              </p>
            )}
            <p className="lock-note">
              Your prompt locks on submit. Scoring happens after the clock.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}

function Results() {
  const { roundId = "" } = useParams();
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const result = await request<Result>(
          `/api/v1/rounds/${roundId}/result`,
        );
        if (!alive) return;
        setData(result);
        if (result.status === "scoring") window.setTimeout(poll, 1200);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    void poll();
    return () => {
      alive = false;
    };
  }, [roundId]);
  if (error)
    return (
      <main className="page-shell">
        <div className="loading-card">
          {error}
          <br />
          <Link to="/">Return home</Link>
        </div>
      </main>
    );
  if (!data || data.status === "scoring")
    return (
      <main className="page-shell">
        <nav className="nav">
          <Link className="brand" to="/">
            PROMPT<span>ARENA</span>
          </Link>
        </nav>
        <div className="loading-card scoring">
          <span className="spinner" />
          <p>Reading your description…</p>
          <small>Your prompt is locked. Scoring happens after the round.</small>
        </div>
      </main>
    );
  if (data.status !== "completed")
    return (
      <main className="page-shell">
        <nav className="nav">
          <Link className="brand" to="/">
            PROMPT<span>ARENA</span>
          </Link>
        </nav>
        <div className="loading-card">
          <h2>Round {data.status}</h2>
          <p>
            {data.status === "expired"
              ? "The time ended before a description was submitted."
              : "This round could not be scored."}
          </p>
          <Link className="button primary" to="/play">
            Play again →
          </Link>
        </div>
      </main>
    );
  return (
    <main className="page-shell results-shell">
      <nav className="nav">
        <Link className="brand" to="/">
          PROMPT<span>ARENA</span>
        </Link>
        <Link to="/play" className="nav-link">
          New round ↗
        </Link>
      </nav>
      <header className="result-heading">
        <p className="eyebrow">ROUND COMPLETE · PROMPT SCORE</p>
        <h1>
          Your eye for
          <br />
          <em>detail.</em>
        </h1>
        <p>
          Scores are estimates based on visual details. Every description sees
          something a little differently.
        </p>
      </header>
      <section className="score-grid">
        <div className="score-card">
          <span>YOUR PROMPT SCORE</span>
          <strong>
            {data.finalScore}
            <small>/100</small>
          </strong>
          <div className="score-bar">
            <i style={{ width: `${data.finalScore}%` }} />
          </div>
          <p>Based on your description of the target image.</p>
        </div>
        <div className="result-image-card">
          <span>THE IMAGE</span>
          {data.target && (
            <img src={data.target.imageUrl} alt={data.target.altText} />
          )}
          <p>{data.target?.altText}</p>
        </div>
      </section>
      <section className="feedback-section">
        <div className="section-title">
          <div>
            <p className="eyebrow">THE BREAKDOWN</p>
            <h2>What you picked up</h2>
          </div>
          <span>
            SCORING{" "}
            {data.scoreMode === "prompt_only" ? "PROMPT ONLY" : "COMBINED"}
          </span>
        </div>
        <div className="attribute-list">
          {data.attributes?.map((item) => (
            <article key={item.label} className="attribute">
              <span className={`judgment ${item.judgment}`}>
                {item.judgment === "matched"
                  ? "✓"
                  : item.judgment === "partial"
                    ? "◐"
                    : "—"}
              </span>
              <div>
                <strong>{item.label}</strong>
                <p>{item.reason}</p>
              </div>
              <small>{item.judgment}</small>
            </article>
          ))}
        </div>
        <div className="feedback-callout">
          <span>✳</span>
          <p>{data.feedback}</p>
        </div>
      </section>
      <section className="your-prompt">
        <p className="eyebrow">YOUR DESCRIPTION</p>
        <blockquote>“{data.prompt}”</blockquote>
        <p className="eyebrow reference-heading">REFERENCE PROMPT</p>
        <blockquote className="reference-quote">
          “{data.referencePrompt}”
        </blockquote>
        <p className="reference-note">
          One clear description of the image. Other accurate wording can also be
          correct.
        </p>
        <Link className="button primary" to="/play">
          Play again <span>→</span>
        </Link>
      </section>
    </main>
  );
}

function NotFound() {
  return (
    <main className="page-shell">
      <div className="loading-card">
        <h1>Page not found</h1>
        <Link to="/">Back to the arena</Link>
      </div>
    </main>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/play" element={<Play />} />
      <Route path="/results/:roundId" element={<Results />} />
      <Route path="/how-to-play" element={<HowToPlay />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
