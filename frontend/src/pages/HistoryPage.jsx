import { useState, useEffect } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

function HistoryPage({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search filters
  const [filterTopic, setFilterTopic] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [isFiltered, setIsFiltered] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, [user.id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/quiz-history/${user.id}`);
      if (!res.ok) throw new Error('Failed to load history');
      const data = await res.json();
      setHistory(data.history || []);
      setIsFiltered(false);
    } catch {
      setError('Unable to load quiz history.');
    } finally {
      setLoading(false);
    }
  };

  const searchHistory = async () => {
    if (!filterTopic.trim() && !filterDifficulty) {
      fetchHistory();
      return;
    }

    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (filterTopic.trim()) params.set('topic', filterTopic.trim());
      if (filterDifficulty) params.set('difficulty', filterDifficulty);

      const res = await fetch(
        `${API_BASE}/quiz-history-search/${user.id}?${params.toString()}`
      );
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      setHistory(data.history || []);
      setIsFiltered(true);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterTopic('');
    setFilterDifficulty('');
    fetchHistory();
  };

  const getDifficultyClass = (d) => {
    const map = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' };
    return map[d] || 'badge-easy';
  };

  return (
    <div className="history-page">
      <div className="page-header">
        <h2>📜 Quiz History</h2>
        <p>Review your past quiz attempts and performance</p>
      </div>

      {/* Search / Filter */}
      <div className="glass-card hist-filter-card">
        <div className="hist-filter-row">
          <div className="hist-filter-field">
            <label>Topic</label>
            <input
              type="text"
              placeholder="Search by topic..."
              value={filterTopic}
              onChange={(e) => setFilterTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchHistory()}
            />
          </div>
          <div className="hist-filter-field">
            <label>Difficulty</label>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="hist-filter-actions">
            <button className="btn-primary" onClick={searchHistory}>
              🔍 Search
            </button>
            {isFiltered && (
              <button className="btn-secondary" onClick={clearFilters}>
                ✕ Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="hist-cards-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card hist-skeleton-card">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-text" />
              <div className="skeleton skeleton-text" style={{ width: '50%' }} />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass-card hist-error">
          ⚠️ {error}
          <button className="btn-secondary" onClick={fetchHistory} style={{ marginLeft: 12 }}>
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {!loading && !error && history.length > 0 && (
        <div className="hist-cards-grid">
          {history.map((item, idx) => {
            const pct =
              item.total_marks > 0
                ? Math.round((item.score / item.total_marks) * 100)
                : 0;
            return (
              <div
                key={item.result_id || idx}
                className="glass-card hist-card"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="hist-card-header">
                  <h4 className="hist-card-topic">{item.topic}</h4>
                  <span className={`badge ${getDifficultyClass(item.difficulty)}`}>
                    {item.difficulty}
                  </span>
                </div>

                <div className="hist-card-stats">
                  <div className="hist-card-score">
                    <span className="hist-score-num">{item.score}</span>
                    <span className="hist-score-sep">/</span>
                    <span className="hist-score-total">{item.total_marks}</span>
                  </div>
                  <div
                    className="hist-card-pct"
                    style={{
                      color:
                        pct >= 70
                          ? 'var(--accent-green)'
                          : pct >= 40
                          ? 'var(--accent-yellow)'
                          : 'var(--accent-red)',
                    }}
                  >
                    {pct}%
                  </div>
                </div>

                <div className="hist-card-bar-wrap">
                  <div
                    className="hist-card-bar"
                    style={{
                      width: `${pct}%`,
                      background:
                        pct >= 70
                          ? 'var(--gradient-success)'
                          : pct >= 40
                          ? 'var(--gradient-gold)'
                          : 'var(--gradient-danger)',
                    }}
                  />
                </div>

                <div className="hist-card-footer">
                  <span className="hist-card-questions">
                    {item.number_of_questions || item.total_marks} questions
                  </span>
                  <span className="hist-card-date">
                    {new Date(item.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && history.length === 0 && (
        <div className="glass-card">
          <div className="empty-state">
            <span className="empty-state-icon">📭</span>
            <h3>{isFiltered ? 'No results found' : 'No quiz history yet'}</h3>
            <p>
              {isFiltered
                ? 'Try adjusting your search filters.'
                : 'Take a quiz to see your results here!'}
            </p>
          </div>
        </div>
      )}

      <style>{`
        .history-page {
          animation: fadeIn 0.4s ease;
        }

        .hist-filter-card {
          padding: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .hist-filter-row {
          display: flex;
          gap: var(--space-md);
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .hist-filter-field {
          flex: 1;
          min-width: 180px;
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .hist-filter-field label {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .hist-filter-actions {
          display: flex;
          gap: var(--space-sm);
          padding-bottom: 1px;
        }

        .hist-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--space-lg);
        }

        .hist-card {
          padding: var(--space-lg);
          animation: slideUp 0.4s ease forwards;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .hist-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }

        .hist-card-topic {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-primary);
          text-transform: capitalize;
        }

        .hist-card-stats {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: var(--space-sm);
        }

        .hist-card-score {
          display: flex;
          align-items: baseline;
          gap: 3px;
        }

        .hist-score-num {
          font-size: 1.5rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .hist-score-sep {
          color: var(--text-muted);
          font-size: 1rem;
        }

        .hist-score-total {
          font-size: 1rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .hist-card-pct {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .hist-card-bar-wrap {
          height: 5px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: var(--radius-full);
          margin-bottom: var(--space-md);
          overflow: hidden;
        }

        .hist-card-bar {
          height: 100%;
          border-radius: var(--radius-full);
          transition: width 0.8s ease;
        }

        .hist-card-footer {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .hist-skeleton-card {
          padding: var(--space-lg);
        }

        .hist-error {
          padding: var(--space-lg);
          color: var(--accent-red);
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
        }

        @media (max-width: 480px) {
          .hist-cards-grid {
            grid-template-columns: 1fr;
          }

          .hist-filter-row {
            flex-direction: column;
          }

          .hist-filter-field {
            min-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default HistoryPage;
