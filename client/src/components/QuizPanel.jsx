import { useEffect, useRef, useState } from 'react';
import apiClient from '../api/client';

const FONT   = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';
const MONO   = '"IBM Plex Mono", "SFMono-Regular", Consolas, monospace';
const ORANGE = '#FF8C00';
const CYAN   = '#00d4ff';
const GREEN  = '#4ade80';
const RED    = '#f87171';
const GOLD   = '#fbbf24';
const BG     = 'linear-gradient(180deg, rgba(14,19,30,0.99) 0%, rgba(9,13,22,0.99) 100%)';
const TIMER_SEC = 30;

// ─── Results screen ──────────────────────────────────────────────────────────

function ResultsScreen({ questions, selected, score, badgeName, onClose }) {
  const isPerfect = score === 5;
  const isGood    = score >= 3;

  const scoreColor = isPerfect ? GOLD : isGood ? GREEN : RED;
  const headline   = isPerfect
    ? `🏅 ${badgeName} Badge Earned!`
    : isGood
    ? 'Good Effort!'
    : 'Keep Practising!';

  return (
    <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Score banner */}
      <div style={{
        textAlign: 'center', padding: '28px 20px',
        background: `${scoreColor}12`,
        border: `1px solid ${scoreColor}44`,
        borderRadius: 18,
      }}>
        {isPerfect && (
          <div style={{ fontSize: '3rem', marginBottom: 8, animation: 'badgePop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>🏅</div>
        )}
        <div style={{ fontFamily: MONO, fontSize: '2.8rem', fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
          {score}/5
        </div>
        <div style={{ fontFamily: FONT, fontSize: '1.05rem', color: '#eef8ff', marginTop: 10, fontWeight: 600 }}>
          {headline}
        </div>
        {isPerfect && (
          <div style={{ fontFamily: FONT, fontSize: '0.82rem', color: 'rgba(251,191,36,0.7)', marginTop: 6 }}>
            Pinned to your lab desk ✦
          </div>
        )}
      </div>

      {/* Per-question breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {questions.map((q, i) => {
          const chosen  = selected[i];
          const correct = q.correct;
          const right   = chosen === correct;

          return (
            <div key={i} style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: `1px solid ${right ? GREEN : RED}44`,
              background: right ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: '0.9rem', flexShrink: 0, marginTop: 1 }}>
                  {right ? '✅' : '❌'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: '0.85rem', color: '#dff7ff', lineHeight: 1.4, marginBottom: 4 }}>
                    Q{i + 1}: {q.q}
                  </div>
                  {!right && (
                    <>
                      <div style={{ fontFamily: FONT, fontSize: '0.78rem', color: `${RED}cc` }}>
                        Your answer: {chosen !== undefined ? q.options[chosen] : 'Not answered'}
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: '0.78rem', color: `${GREEN}cc`, marginTop: 2 }}>
                        Correct: {q.options[correct]}
                      </div>
                      {q.explanation && (
                        <div style={{
                          marginTop: 6, padding: '7px 10px',
                          background: 'rgba(248,113,113,0.08)', borderRadius: 7,
                          fontFamily: FONT, fontSize: '0.76rem',
                          color: 'rgba(255,200,200,0.8)', lineHeight: 1.5,
                        }}>
                          {q.explanation}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={onClose}
        style={{
          background: 'rgba(0,212,255,0.1)', border: `1px solid ${CYAN}55`,
          color: CYAN, fontFamily: MONO, fontSize: '0.8rem',
          letterSpacing: '0.1em', padding: '13px 0',
          borderRadius: 12, cursor: 'pointer', width: '100%',
        }}
      >
        CLOSE QUIZ
      </button>
    </div>
  );
}

// ─── Main Quiz Panel ─────────────────────────────────────────────────────────

export default function QuizPanel({ context, onClose, onScoreResult, badgeName }) {
  const [questions, setQuestions] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [currentQ,  setCurrentQ]  = useState(0);
  const [selected,  setSelected]  = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score,     setScore]     = useState(0);
  const [timer,     setTimer]     = useState(TIMER_SEC);
  const [animDir,   setAnimDir]   = useState('enter'); // 'enter' | 'exit'
  const [selectedAnim, setSelectedAnim] = useState(null); // optIdx that just got selected

  const timerRef  = useRef(null);
  const scoreRef  = useRef(false); // prevent double-calling onScoreResult

  // Fetch questions
  useEffect(() => {
    setLoading(true);
    apiClient.post('/api/quiz', { context })
      .then(res => {
        const qs = res.data?.questions;
        if (!Array.isArray(qs) || qs.length === 0) throw new Error();
        setQuestions(qs);
      })
      .catch(() => setError('Could not load quiz questions. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  // Countdown timer per question
  useEffect(() => {
    if (!questions || submitted) return;
    setTimer(TIMER_SEC);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          goNext(true);
          return TIMER_SEC;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQ, questions, submitted]);

  function goNext(auto = false) {
    if (!questions) return;
    if (currentQ >= questions.length - 1) return;
    setAnimDir('exit');
    setTimeout(() => {
      setCurrentQ(q => q + 1);
      setAnimDir('enter');
    }, 180);
  }

  function handleSelect(optIdx) {
    if (submitted || selected[currentQ] !== undefined) return;
    clearInterval(timerRef.current);
    setSelectedAnim(optIdx);
    setTimeout(() => setSelectedAnim(null), 350);
    setSelected(prev => ({ ...prev, [currentQ]: optIdx }));
  }

  function handleSubmit() {
    if (scoreRef.current) return;
    scoreRef.current = true;
    clearInterval(timerRef.current);
    let s = 0;
    questions.forEach((q, i) => { if (selected[i] === q.correct) s++; });
    setScore(s);
    setSubmitted(true);
    onScoreResult?.(s);
  }

  const q          = questions?.[currentQ];
  const total      = questions?.length ?? 5;
  const timerPct   = timer / TIMER_SEC;
  const allAnswered = questions && questions.every((_, i) => selected[i] !== undefined);
  const isLast     = currentQ === total - 1;

  return (
    <>
      <style>{`
        @keyframes qEnter {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes qExit {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-32px); }
        }
        @keyframes optPulse {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.025); }
          100% { transform: scale(1); }
        }
        @keyframes badgePop {
          0%   { transform: scale(0); opacity: 0; }
          60%  { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes timerPulse {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.55; }
        }
      `}</style>

      <div style={{
        height: '100%', overflowY: 'auto',
        background: BG,
        border: `1px solid rgba(0,212,255,0.22)`,
        borderRadius: 22,
        boxShadow: '0 0 40px rgba(0,212,255,0.07), 0 18px 60px rgba(0,0,0,0.45)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Panel header */}
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid rgba(0,212,255,0.14)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>🏅</span>
            <span style={{ fontFamily: MONO, fontSize: '0.74rem', letterSpacing: '0.14em', color: GOLD, textTransform: 'uppercase' }}>
              Earn a Badge
            </span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: 'rgba(180,210,255,0.4)', cursor: 'pointer',
            fontSize: '1.1rem', padding: '2px 6px',
          }}>✕</button>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 40, color: 'rgba(180,210,255,0.5)', fontFamily: FONT }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚗️</div>
              Generating questions…
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 40, color: RED, fontFamily: FONT, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Results */}
        {submitted && questions && (
          <ResultsScreen
            questions={questions}
            selected={selected}
            score={score}
            badgeName={badgeName}
            onClose={onClose}
          />
        )}

        {/* Active quiz */}
        {!loading && !error && questions && !submitted && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 0 20px' }}>

            {/* Progress bar + counter */}
            <div style={{ padding: '14px 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontFamily: MONO, fontSize: '0.72rem', color: CYAN, letterSpacing: '0.1em' }}>
                  Q{currentQ + 1} / {total}
                </span>
                <span style={{
                  fontFamily: MONO, fontSize: '0.72rem',
                  color: timer <= 10 ? RED : 'rgba(180,210,255,0.5)',
                  animation: timer <= 10 ? 'timerPulse 0.8s ease-in-out infinite' : 'none',
                }}>
                  ⏱ {timer}s
                </span>
              </div>
              {/* Step dots */}
              <div style={{ display: 'flex', gap: 5 }}>
                {questions.map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 2,
                    background: i < currentQ
                      ? (selected[i] === questions[i].correct ? GREEN : RED)
                      : i === currentQ ? CYAN : 'rgba(255,255,255,0.12)',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
              {/* Timer bar */}
              <div style={{ height: 2, borderRadius: 1, background: 'rgba(255,255,255,0.07)', marginTop: 6, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 1,
                  background: timer <= 10 ? RED : ORANGE,
                  width: `${timerPct * 100}%`,
                  transition: 'width 1s linear, background 0.3s',
                }} />
              </div>
            </div>

            {/* Question card */}
            <div
              key={currentQ}
              style={{
                flex: 1, padding: '18px 20px 0',
                animation: `${animDir === 'enter' ? 'qEnter' : 'qExit'} 0.18s ease forwards`,
              }}
            >
              <div style={{
                fontFamily: FONT, fontSize: '0.97rem', color: '#dff7ff',
                lineHeight: 1.55, marginBottom: 18, fontWeight: 500,
              }}>
                {q?.q}
              </div>

              {/* Option cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {q?.options.map((opt, oi) => {
                  const isChosen = selected[currentQ] === oi;
                  const isAnimating = selectedAnim === oi;

                  return (
                    <button
                      key={oi}
                      onClick={() => handleSelect(oi)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 16px',
                        background: isChosen
                          ? 'rgba(0,212,255,0.13)'
                          : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${isChosen ? CYAN : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: 12,
                        cursor: selected[currentQ] !== undefined ? 'default' : 'pointer',
                        textAlign: 'left', width: '100%',
                        color: isChosen ? '#e8f8ff' : 'rgba(200,220,255,0.78)',
                        fontFamily: FONT, fontSize: '0.88rem', lineHeight: 1.4,
                        transition: 'border-color 0.15s, background 0.15s, transform 0.1s',
                        animation: isAnimating ? 'optPulse 0.35s ease' : 'none',
                        boxShadow: isChosen ? `0 0 12px rgba(0,212,255,0.18)` : 'none',
                      }}
                    >
                      <span style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        border: `1.5px solid ${isChosen ? CYAN : 'rgba(255,255,255,0.2)'}`,
                        display: 'grid', placeItems: 'center',
                        fontFamily: MONO, fontSize: '0.72rem',
                        background: isChosen ? CYAN : 'transparent',
                        color: isChosen ? '#050a14' : 'inherit',
                        transition: 'background 0.15s, border-color 0.15s',
                        fontWeight: 700,
                      }}>
                        {String.fromCharCode(65 + oi)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div style={{ padding: '18px 20px 0', display: 'flex', gap: 10 }}>
              {!isLast ? (
                <button
                  onClick={goNext}
                  disabled={selected[currentQ] === undefined}
                  style={{
                    flex: 1, padding: '13px 0',
                    background: selected[currentQ] !== undefined
                      ? `linear-gradient(135deg, ${CYAN}cc, rgba(0,140,180,0.9))`
                      : 'rgba(0,212,255,0.08)',
                    border: `1px solid ${selected[currentQ] !== undefined ? CYAN : 'rgba(0,212,255,0.2)'}`,
                    color: selected[currentQ] !== undefined ? '#050a14' : 'rgba(0,212,255,0.35)',
                    fontFamily: MONO, fontSize: '0.8rem', letterSpacing: '0.1em',
                    borderRadius: 11, cursor: selected[currentQ] !== undefined ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                  }}
                >
                  NEXT →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!allAnswered}
                  style={{
                    flex: 1, padding: '13px 0',
                    background: allAnswered
                      ? `linear-gradient(135deg, ${ORANGE}, #cc6a00)`
                      : 'rgba(255,140,0,0.1)',
                    border: `1px solid ${allAnswered ? ORANGE : 'rgba(255,140,0,0.2)'}`,
                    color: allAnswered ? '#fff' : 'rgba(255,255,255,0.3)',
                    fontFamily: MONO, fontSize: '0.8rem', letterSpacing: '0.1em',
                    borderRadius: 11, cursor: allAnswered ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                  }}
                >
                  SUBMIT 🏅
                </button>
              )}
            </div>

          </div>
        )}
      </div>
    </>
  );
}
