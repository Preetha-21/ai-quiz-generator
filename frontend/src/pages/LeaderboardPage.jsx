import { useState, useEffect } from 'react';

const API_BASE = 'https://ai-quiz-generator-backend-usr0.onrender.com';

function LeaderboardPage({ user }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/leaderboard`);
      if (!res.ok) throw new Error('Failed to load leaderboard');
      const data = await res.json();
      setLeaderboard(data.leaderboard || []);
    } catch {
      setError('Unable to load leaderboard.');
    } finally {
      setLoading(false);
    }
  };

  const getMedal = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getRankClass = (rank) => {
    if (rank === 1) return 'lb-rank-gold';
    if (rank === 2) return 'lb-rank-silver';
    if (rank === 3) return 'lb-rank-bronze';
    return '';
  };

  return (
    <div className="leaderboard-page">
      <div className="page-header">
        <h2>🏆 Leaderboard</h2>
        <p>See how you stack up against other quiz takers</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass-card lb-table-card">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="lb-skeleton-row">
              <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton skeleton-text" style={{ width: '40%' }} />
                <div className="skeleton skeleton-text" style={{ width: '25%', height: 10 }} />
              </div>
              <div className="skeleton" style={{ width: 60, height: 20 }} />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass-card lb-error">
          ⚠️ {error}
          <button className="btn-secondary" onClick={fetchLeaderboard} style={{ marginLeft: 12 }}>
            Retry
          </button>
        </div>
      )}

      {/* Leaderboard Table */}
      {!loading && !error && leaderboard.length > 0 && (
        <div className="glass-card lb-table-card">
          <div className="lb-table-wrapper">
            <table className="lb-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>Rank</th>
                  <th>Player</th>
                  <th>Total Score</th>
                  <th>Quizzes</th>
                  <th>Avg %</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isCurrentUser = entry.user_id === user.id;
                  const medal = getMedal(rank);

                  return (
                    <tr
                      key={entry.user_id}
                      className={`lb-row ${getRankClass(rank)} ${
                        isCurrentUser ? 'lb-row-current' : ''
                      }`}
                      style={{ animationDelay: `${idx * 0.05}s` }}
                    >
                      <td className="lb-td-rank">
                        {medal ? (
                          <span className="lb-medal">{medal}</span>
                        ) : (
                          <span className="lb-rank-num">{rank}</span>
                        )}
                      </td>
                      <td className="lb-td-player">
                        <div className="lb-player-info">
                          <div
                            className="lb-player-avatar"
                            style={{
                              background:
                                rank === 1
                                  ? 'var(--gradient-gold)'
                                  : rank === 2
                                  ? 'linear-gradient(135deg, #9ca3af, #d1d5db)'
                                  : rank === 3
                                  ? 'linear-gradient(135deg, #cd7f32, #daa520)'
                                  : 'var(--gradient-primary)',
                            }}
                          >
                            {entry.name
                              .split(' ')
                              .map((w) => w[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="lb-player-name">
                              {entry.name}
                              {isCurrentUser && (
                                <span className="lb-you-badge">You</span>
                              )}
                            </div>
                            <div className="lb-player-email">{entry.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="lb-td-score">
                        <span className="lb-score-value">{entry.total_score}</span>
                      </td>
                      <td className="lb-td-quizzes">{entry.quizzes_taken}</td>
                      <td className="lb-td-avg">
                        <span
                          className="lb-avg-badge"
                          style={{
                            color:
                              entry.avg_percentage >= 70
                                ? 'var(--accent-green)'
                                : entry.avg_percentage >= 40
                                ? 'var(--accent-yellow)'
                                : 'var(--accent-red)',
                            background:
                              entry.avg_percentage >= 70
                                ? 'rgba(52, 211, 153, 0.12)'
                                : entry.avg_percentage >= 40
                                ? 'rgba(251, 191, 36, 0.12)'
                                : 'rgba(248, 113, 113, 0.12)',
                          }}
                        >
                          {Math.round(entry.avg_percentage)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && leaderboard.length === 0 && (
        <div className="glass-card">
          <div className="empty-state">
            <span className="empty-state-icon">🏟️</span>
            <h3>No entries yet</h3>
            <p>Be the first to appear on the leaderboard by taking a quiz!</p>
          </div>
        </div>
      )}

      <style>{`
        .leaderboard-page {
          animation: fadeIn 0.4s ease;
        }

        .lb-table-card {
          padding: var(--space-lg);
          overflow: hidden;
        }

        .lb-table-wrapper {
          overflow-x: auto;
        }

        .lb-table {
          width: 100%;
          border-collapse: collapse;
        }

        .lb-table th {
          text-align: left;
          padding: 14px 16px;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--glass-border);
          font-weight: 600;
        }

        .lb-table td {
          padding: 14px 16px;
          font-size: 0.9rem;
          color: var(--text-secondary);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .lb-row {
          transition: background var(--transition-fast);
          animation: slideUp 0.3s ease forwards;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .lb-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }

        .lb-row-current {
          background: rgba(139, 92, 246, 0.08) !important;
          border-left: 3px solid var(--accent-purple);
        }

        .lb-rank-gold td { color: var(--text-primary); }
        .lb-rank-silver td { color: var(--text-primary); }
        .lb-rank-bronze td { color: var(--text-primary); }

        .lb-td-rank {
          text-align: center;
        }

        .lb-medal {
          font-size: 1.5rem;
        }

        .lb-rank-num {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-muted);
        }

        .lb-td-player {
          min-width: 200px;
        }

        .lb-player-info {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .lb-player-avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .lb-player-name {
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .lb-you-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          background: var(--gradient-primary);
          border-radius: var(--radius-full);
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .lb-player-email {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .lb-td-score {
          font-weight: 700;
          color: var(--text-primary) !important;
        }

        .lb-score-value {
          font-size: 1.05rem;
          font-weight: 800;
        }

        .lb-td-quizzes {
          font-weight: 500;
        }

        .lb-avg-badge {
          padding: 4px 12px;
          border-radius: var(--radius-full);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .lb-skeleton-row {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          padding: var(--space-md);
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .lb-error {
          padding: var(--space-lg);
          color: var(--accent-red);
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        @media (max-width: 640px) {
          .lb-table th:nth-child(4),
          .lb-table td:nth-child(4) {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default LeaderboardPage;
