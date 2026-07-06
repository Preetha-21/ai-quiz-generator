import { useState, useEffect, useRef, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = 'http://127.0.0.1:8000';
const TIMER_SECONDS = 300; // 5 minutes

function QuizPage({ user }) {
  // Form state
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('easy');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);

  // Quiz state
  const [quizId, setQuizId] = useState(null);
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef(null);

  // Results state
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Current question for progress
  const [currentView, setCurrentView] = useState(0);

  const saveResult = async (finalScore = score) => {
    try {
      setSaving(true);
      setSaveError('');

      const res = await fetch(`${API_BASE}/save-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          quiz_id: quizId,
          score: finalScore,
          total_marks: quiz.length,
        }),
      });

      if (!res.ok) throw new Error('Save failed');
      setSaved(true);
    } catch {
      setSaveError('Failed to save result. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Submit handler wrapped in useCallback so timer can call it
  const submitQuiz = useCallback(() => {
    if (submitted) return;

    // Stop timer
    setTimerActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let marks = 0;
    quiz.forEach((q, i) => {
      if (answers[i] === q.correct_answer) {
        marks++;
      }
    });

    setScore(marks);
    setSubmitted(true);
    saveResult(marks);
  }, [submitted, quiz, answers, user.id, quizId]);

  // Timer effect
  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive]);

  // Auto-submit when timer reaches 0
  useEffect(() => {
    if (timeLeft === 0 && timerActive && !submitted) {
      submitQuiz();
    }
  }, [timeLeft, timerActive, submitted, submitQuiz]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const generateQuiz = async () => {
    if (!topic.trim()) return;

    try {
      setLoading(true);
      setQuiz([]);
      setAnswers({});
      setSubmitted(false);
      setScore(0);
      setSaved(false);
      setSaveError('');
      setCurrentView(0);
      setQuizId(null);

      const res = await fetch(
        `${API_BASE}/generate-quiz?topic=${encodeURIComponent(topic)}&difficulty=${difficulty}&number_of_questions=${numberOfQuestions}`
      );

      const data = await res.json();
      const questions = data.questions || data.quiz?.questions || [];

      if (questions.length === 0) {
        alert('No questions generated. Please try again.');
        return;
      }

      setQuiz(questions);
      setQuizId(data.quiz_id || null);

      // Start timer
      setTimeLeft(TIMER_SECONDS);
      setTimerActive(true);
    } catch {
      alert('Cannot connect to backend. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (index, option) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [index]: option }));
  };



  const getOptionLabel = (key) => {
    const map = { option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D' };
    return map[key] || key;
  };

  const getOptionText = (question, key) => {
    return question[key] || '';
  };

  const resetQuiz = () => {
    setQuiz([]);
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setSaved(false);
    setSaveError('');
    setQuizId(null);
    setCurrentView(0);
    setTimeLeft(TIMER_SECONDS);
    setTimerActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(102, 126, 234);
    doc.text('QuizAI - Quiz Results', 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Topic: ${topic}  |  Difficulty: ${difficulty}  |  Score: ${score}/${quiz.length}`, 14, 32);
    doc.text(`Date: ${new Date().toLocaleDateString()}  |  Player: ${user.name}`, 14, 39);

    const tableData = quiz.map((q, i) => {
      const userAns = answers[i] ? getOptionText(q, answers[i]) : 'Not answered';
      const correctAns = getOptionText(q, q.correct_answer);
      const result = answers[i] === q.correct_answer ? 'Correct' : 'Wrong';
      return [i + 1, q.question, userAns, correctAns, result];
    });

    autoTable(doc, {
      startY: 46,
      head: [['#', 'Question', 'Your Answer', 'Correct Answer', 'Result']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [102, 126, 234],
        textColor: 255,
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 70 },
        2: { cellWidth: 35 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
      },
      alternateRowStyles: {
        fillColor: [245, 245, 255],
      },
    });

    doc.save(`quiz-results-${topic.replace(/\s+/g, '-')}.pdf`);
  };

  // CSV Export
  const exportCSV = () => {
    const headers = ['#', 'Question', 'Your Answer', 'Correct Answer', 'Result'];
    const rows = quiz.map((q, i) => {
      const userAns = answers[i] ? getOptionText(q, answers[i]) : 'Not answered';
      const correctAns = getOptionText(q, q.correct_answer);
      const result = answers[i] === q.correct_answer ? 'Correct' : 'Wrong';
      return [i + 1, `"${q.question.replace(/"/g, '""')}"`, `"${userAns}"`, `"${correctAns}"`, result];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `quiz-results-${topic.replace(/\s+/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const answeredCount = Object.keys(answers).length;
  const percentage = quiz.length > 0 ? Math.round((score / quiz.length) * 100) : 0;

  return (
    <div className="quiz-page">
      <div className="page-header">
        <h2>🧠 Take a Quiz</h2>
        <p>Generate an AI-powered quiz on any topic</p>
      </div>

      {/* Quiz Generation Form */}
      {quiz.length === 0 && !loading && (
        <div className="glass-card quiz-form-card animate-slide-up">
          <h3 className="quiz-form-title">Configure Your Quiz</h3>
          <div className="quiz-form-grid">
            <div className="quiz-form-field">
              <label>Topic</label>
              <input
                type="text"
                placeholder="e.g., JavaScript, World History, Biology..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && topic.trim() && generateQuiz()}
              />
            </div>

            <div className="quiz-form-field">
              <label>Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">🟢 Easy</option>
                <option value="medium">🟡 Medium</option>
                <option value="hard">🔴 Hard</option>
              </select>
            </div>

            <div className="quiz-form-field">
              <label>Number of Questions</label>
              <input
                type="number"
                min="1"
                max="20"
                value={numberOfQuestions}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 1 && val <= 20) setNumberOfQuestions(val);
                  else if (e.target.value === '') setNumberOfQuestions('');
                }}
              />
            </div>
          </div>

          <button
            className="btn-primary quiz-generate-btn"
            onClick={generateQuiz}
            disabled={!topic.trim()}
          >
            ⚡ Generate Quiz
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="glass-card quiz-loading-card">
          <div className="quiz-loading-content">
            <div className="quiz-loading-spinner" />
            <h3>Generating your quiz...</h3>
            <p>Our AI is crafting questions on &quot;{topic}&quot;</p>
          </div>
        </div>
      )}

      {/* Active Quiz */}
      {quiz.length > 0 && !submitted && !loading && (
        <div className="quiz-active">
          {/* Timer + Progress Bar */}
          <div className="glass-card quiz-toolbar">
            <div className="quiz-toolbar-left">
              <span className="quiz-toolbar-topic">{topic}</span>
              <span className={`badge ${difficulty === 'easy' ? 'badge-easy' : difficulty === 'medium' ? 'badge-medium' : 'badge-hard'}`}>
                {difficulty}
              </span>
            </div>
            <div className="quiz-toolbar-right">
              <div className="quiz-progress-info">
                {answeredCount} / {quiz.length} answered
              </div>
              <div className={`quiz-timer ${timeLeft < 60 ? 'quiz-timer-danger' : ''}`}>
                ⏱ {formatTime(timeLeft)}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="quiz-progress-bar-wrap">
            <div
              className="quiz-progress-bar"
              style={{ width: `${(answeredCount / quiz.length) * 100}%` }}
            />
          </div>

          {/* Questions */}
          <div className="quiz-questions">
            {quiz.map((q, i) => (
              <div
                key={i}
                className={`glass-card quiz-question-card ${answers[i] ? 'quiz-question-answered' : ''}`}
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="quiz-q-header">
                  <span className="quiz-q-number">Q{i + 1}</span>
                  <span className="quiz-q-text">{q.question}</span>
                </div>

                <div className="quiz-options">
                  {['option_a', 'option_b', 'option_c', 'option_d'].map((optKey) => {
                    const letter = optKey.split('_')[1].toUpperCase();
                    const isSelected = answers[i] === optKey;

                    return (
                      <button
                        key={optKey}
                        className={`quiz-option ${isSelected ? 'quiz-option-selected' : ''}`}
                        onClick={() => handleAnswer(i, optKey)}
                        type="button"
                      >
                        <span className="quiz-option-letter">{letter}</span>
                        <span className="quiz-option-text">{q[optKey]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="quiz-submit-area">
            <button className="btn-primary quiz-submit-btn" onClick={submitQuiz}>
              ✅ Submit Quiz
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {submitted && (
        <div className="quiz-results animate-fade-in">
          {/* Score Card */}
          <div className="glass-card quiz-score-card">
            <div className="quiz-score-display">
              <div className="quiz-score-ring">
                <svg viewBox="0 0 120 120" className="quiz-score-svg">
                  <circle cx="60" cy="60" r="52" className="quiz-score-bg-circle" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    className="quiz-score-fg-circle"
                    style={{
                      strokeDasharray: `${(percentage / 100) * 327} 327`,
                      stroke:
                        percentage >= 70
                          ? '#34d399'
                          : percentage >= 40
                          ? '#fbbf24'
                          : '#f87171',
                    }}
                  />
                </svg>
                <div className="quiz-score-center">
                  <span className="quiz-score-pct">{percentage}%</span>
                </div>
              </div>
              <div className="quiz-score-info">
                <h3>
                  {percentage >= 80
                    ? '🎉 Excellent!'
                    : percentage >= 60
                    ? '👏 Good Job!'
                    : percentage >= 40
                    ? '💪 Keep Trying!'
                    : '📚 Keep Learning!'}
                </h3>
                <p className="quiz-score-detail">
                  You scored <strong>{score}</strong> out of <strong>{quiz.length}</strong>
                </p>
                <p className="quiz-score-time">
                  Time used: {formatTime(TIMER_SECONDS - timeLeft)}
                </p>
              </div>
            </div>

            <div className="quiz-result-actions">
              {saveError && <span className="quiz-save-error">{saveError}</span>}

              <button className="btn-secondary" onClick={exportPDF}>
                📄 Download PDF
              </button>
              <button className="btn-secondary" onClick={exportCSV}>
                📊 Download CSV
              </button>
              <button className="btn-primary" onClick={resetQuiz}>
                🔄 Take Another Quiz
              </button>
            </div>
          </div>

          {/* Review Questions */}
          <h3 className="quiz-review-title">📝 Review Answers</h3>
          <div className="quiz-review-list">
            {quiz.map((q, i) => {
              const userAnswer = answers[i];
              const isCorrect = userAnswer === q.correct_answer;

              return (
                <div
                  key={i}
                  className={`glass-card quiz-review-card ${isCorrect ? 'quiz-review-correct' : 'quiz-review-wrong'}`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="quiz-review-header">
                    <span className="quiz-review-num">Q{i + 1}</span>
                    <span className={`quiz-review-badge ${isCorrect ? 'badge-easy' : 'badge-hard'}`}>
                      {isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                  <p className="quiz-review-question">{q.question}</p>

                  <div className="quiz-review-options">
                    {['option_a', 'option_b', 'option_c', 'option_d'].map((optKey) => {
                      const letter = optKey.split('_')[1].toUpperCase();
                      const isUserAnswer = userAnswer === optKey;
                      const isCorrectAnswer = q.correct_answer === optKey;

                      let optClass = 'quiz-review-opt';
                      if (isCorrectAnswer) optClass += ' quiz-review-opt-correct';
                      if (isUserAnswer && !isCorrect) optClass += ' quiz-review-opt-wrong';

                      return (
                        <div key={optKey} className={optClass}>
                          <span className="quiz-review-opt-letter">{letter}</span>
                          <span className="quiz-review-opt-text">{q[optKey]}</span>
                          {isCorrectAnswer && <span className="quiz-review-opt-tag">✓</span>}
                          {isUserAnswer && !isCorrect && (
                            <span className="quiz-review-opt-tag quiz-review-opt-tag-wrong">✗</span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <div className="quiz-review-explanation">
                      <strong>💡 Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .quiz-page {
          animation: fadeIn 0.4s ease;
        }

        /* ---- Form ---- */
        .quiz-form-card {
          padding: var(--space-2xl);
          max-width: 700px;
        }

        .quiz-form-title {
          font-size: 1.2rem;
          margin-bottom: var(--space-xl);
          color: var(--text-primary);
        }

        .quiz-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .quiz-form-grid .quiz-form-field:first-child {
          grid-column: 1 / -1;
        }

        .quiz-form-field {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .quiz-form-field label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .quiz-generate-btn {
          width: 100%;
          padding: 16px;
          font-size: 1.05rem;
        }

        /* ---- Loading ---- */
        .quiz-loading-card {
          padding: var(--space-3xl);
        }

        .quiz-loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-md);
          text-align: center;
        }

        .quiz-loading-spinner {
          width: 56px;
          height: 56px;
          border: 4px solid rgba(139, 92, 246, 0.15);
          border-top: 4px solid var(--accent-purple);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .quiz-loading-content h3 {
          font-size: 1.2rem;
        }

        .quiz-loading-content p {
          color: var(--text-muted);
        }

        /* ---- Toolbar ---- */
        .quiz-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md) var(--space-lg);
          margin-bottom: 4px;
          border-radius: var(--radius-lg) var(--radius-lg) 0 0;
          flex-wrap: wrap;
          gap: var(--space-sm);
        }

        .quiz-toolbar-left {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .quiz-toolbar-topic {
          font-weight: 700;
          font-size: 1rem;
          text-transform: capitalize;
          color: var(--text-primary);
        }

        .quiz-toolbar-right {
          display: flex;
          align-items: center;
          gap: var(--space-lg);
        }

        .quiz-progress-info {
          font-size: 0.82rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .quiz-timer {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--accent-cyan);
          font-variant-numeric: tabular-nums;
          padding: 6px 14px;
          background: rgba(6, 182, 212, 0.1);
          border: 1px solid rgba(6, 182, 212, 0.2);
          border-radius: var(--radius-md);
          transition: all var(--transition-base);
        }

        .quiz-timer-danger {
          color: var(--accent-red) !important;
          background: rgba(248, 113, 113, 0.1) !important;
          border-color: rgba(248, 113, 113, 0.3) !important;
          animation: pulse 1s ease-in-out infinite;
        }

        /* ---- Progress Bar ---- */
        .quiz-progress-bar-wrap {
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
          margin-bottom: var(--space-lg);
          border-radius: 0 0 var(--radius-lg) var(--radius-lg);
          overflow: hidden;
        }

        .quiz-progress-bar {
          height: 100%;
          background: var(--gradient-primary);
          border-radius: var(--radius-full);
          transition: width 0.5s ease;
        }

        /* ---- Question Cards ---- */
        .quiz-questions {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .quiz-question-card {
          padding: var(--space-lg);
          animation: slideUp 0.4s ease forwards;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .quiz-question-answered {
          border-color: rgba(139, 92, 246, 0.25);
        }

        .quiz-q-header {
          display: flex;
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
          align-items: flex-start;
        }

        .quiz-q-number {
          flex-shrink: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gradient-primary);
          border-radius: var(--radius-sm);
          font-size: 0.78rem;
          font-weight: 700;
          color: white;
        }

        .quiz-q-text {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.5;
          padding-top: 6px;
        }

        /* ---- Options ---- */
        .quiz-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-sm);
        }

        .quiz-option {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: 14px var(--space-md);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          cursor: pointer;
          text-align: left;
          color: var(--text-secondary);
          transition: all var(--transition-base);
          font-size: 0.9rem;
        }

        .quiz-option:hover {
          background: rgba(139, 92, 246, 0.08);
          border-color: rgba(139, 92, 246, 0.25);
          color: var(--text-primary);
          transform: translateY(-1px);
        }

        .quiz-option-selected {
          background: rgba(139, 92, 246, 0.15) !important;
          border-color: var(--accent-purple) !important;
          color: var(--text-primary) !important;
          box-shadow: 0 0 12px rgba(139, 92, 246, 0.2);
        }

        .quiz-option-letter {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.06);
          font-weight: 700;
          font-size: 0.8rem;
          flex-shrink: 0;
          transition: all var(--transition-base);
        }

        .quiz-option-selected .quiz-option-letter {
          background: var(--gradient-primary);
          color: white;
        }

        .quiz-option-text {
          flex: 1;
          line-height: 1.4;
        }

        /* ---- Submit ---- */
        .quiz-submit-area {
          margin-top: var(--space-xl);
          display: flex;
          justify-content: center;
        }

        .quiz-submit-btn {
          padding: 16px 48px;
          font-size: 1.05rem;
        }

        /* ---- Score Card ---- */
        .quiz-score-card {
          padding: var(--space-2xl);
          margin-bottom: var(--space-xl);
          animation: scaleIn 0.5s ease;
        }

        .quiz-score-display {
          display: flex;
          align-items: center;
          gap: var(--space-2xl);
          margin-bottom: var(--space-xl);
          flex-wrap: wrap;
          justify-content: center;
        }

        .quiz-score-ring {
          position: relative;
          width: 140px;
          height: 140px;
          flex-shrink: 0;
        }

        .quiz-score-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }

        .quiz-score-bg-circle {
          fill: none;
          stroke: rgba(255, 255, 255, 0.06);
          stroke-width: 8;
        }

        .quiz-score-fg-circle {
          fill: none;
          stroke-width: 8;
          stroke-linecap: round;
          transition: stroke-dasharray 1.5s ease;
        }

        .quiz-score-center {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .quiz-score-pct {
          font-size: 2rem;
          font-weight: 800;
          color: var(--text-primary);
          animation: countUp 0.8s ease;
        }

        .quiz-score-info {
          text-align: center;
        }

        .quiz-score-info h3 {
          font-size: 1.5rem;
          margin-bottom: var(--space-sm);
        }

        .quiz-score-detail {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: var(--space-xs);
        }

        .quiz-score-time {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .quiz-result-actions {
          display: flex;
          gap: var(--space-sm);
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
        }

        .quiz-saved-msg {
          color: var(--accent-green);
          font-weight: 600;
          font-size: 0.9rem;
          padding: 10px 20px;
        }

        .quiz-save-error {
          color: var(--accent-red);
          font-size: 0.85rem;
        }

        /* ---- Review ---- */
        .quiz-review-title {
          font-size: 1.2rem;
          margin-bottom: var(--space-lg);
          color: var(--text-primary);
        }

        .quiz-review-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-lg);
        }

        .quiz-review-card {
          padding: var(--space-lg);
          animation: slideUp 0.4s ease forwards;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .quiz-review-correct {
          border-left: 3px solid var(--accent-green);
        }

        .quiz-review-wrong {
          border-left: 3px solid var(--accent-red);
        }

        .quiz-review-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-md);
        }

        .quiz-review-num {
          font-weight: 700;
          font-size: 0.9rem;
          color: var(--text-muted);
        }

        .quiz-review-badge {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .quiz-review-question {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-md);
          line-height: 1.5;
        }

        .quiz-review-options {
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }

        .quiz-review-opt {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: 10px var(--space-md);
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          font-size: 0.88rem;
          color: var(--text-secondary);
          transition: none;
        }

        .quiz-review-opt-correct {
          background: rgba(52, 211, 153, 0.1) !important;
          border-color: rgba(52, 211, 153, 0.3) !important;
          color: var(--accent-green) !important;
        }

        .quiz-review-opt-wrong {
          background: rgba(248, 113, 113, 0.1) !important;
          border-color: rgba(248, 113, 113, 0.3) !important;
          color: var(--accent-red) !important;
        }

        .quiz-review-opt-letter {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.06);
          font-weight: 700;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        .quiz-review-opt-correct .quiz-review-opt-letter {
          background: rgba(52, 211, 153, 0.2);
          color: var(--accent-green);
        }

        .quiz-review-opt-wrong .quiz-review-opt-letter {
          background: rgba(248, 113, 113, 0.2);
          color: var(--accent-red);
        }

        .quiz-review-opt-text {
          flex: 1;
          line-height: 1.4;
        }

        .quiz-review-opt-tag {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--accent-green);
        }

        .quiz-review-opt-tag-wrong {
          color: var(--accent-red);
        }

        .quiz-review-explanation {
          padding: var(--space-md);
          background: rgba(139, 92, 246, 0.06);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: var(--radius-md);
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .quiz-review-explanation strong {
          color: var(--accent-purple);
        }

        @media (max-width: 768px) {
          .quiz-options {
            grid-template-columns: 1fr;
          }

          .quiz-form-grid {
            grid-template-columns: 1fr;
          }

          .quiz-score-display {
            flex-direction: column;
            text-align: center;
          }

          .quiz-result-actions {
            flex-direction: column;
          }

          .quiz-result-actions button,
          .quiz-result-actions .quiz-saved-msg {
            width: 100%;
            text-align: center;
          }
        }

        @media (max-width: 480px) {
          .quiz-form-card {
            padding: var(--space-lg);
          }

          .quiz-score-card {
            padding: var(--space-lg);
          }
        }
      `}</style>
    </div>
  );
}

export default QuizPage;
