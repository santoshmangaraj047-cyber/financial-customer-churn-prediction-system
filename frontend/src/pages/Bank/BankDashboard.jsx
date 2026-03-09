import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AuthContext } from "../../context/auth-context";
import { bankBatchPredict, getChurnDistribution } from "../../services/api";
import ChurnChart from "../../components/ChurnChart";
import ChurnPrediction from "./ChurnPrediction";
import Profile from "./Profile";

const colors = {
  primary: '#001845',
  secondary: '#023E7D',
  accent: '#0466C8',
  muted: '#5C677D',
  white: '#ffffff',
  lightBg: '#f8fafc',
  border: '#e2e8f0',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444'
};

const PIE_COLORS = [colors.danger, colors.success, colors.warning];
const SESSION_KEY = 'bank_prediction_chart_sessions';

const getRiskLevel = (probability) => {
  const value = Number(probability) || 0;
  if (value >= 0.7) return 'High';
  if (value >= 0.4) return 'Medium';
  return 'Low';
};

const parseCsvActualLabels = async (selectedFile) => {
  try {
    const text = await selectedFile.text();
    const [headerLine, ...rows] = text.split(/\r?\n/).filter(Boolean);
    if (!headerLine) return [];

    const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());
    const exitedIndex = headers.findIndex((h) => ['exited', 'churn', 'label', 'target'].includes(h));
    if (exitedIndex < 0) return [];

    return rows
      .map((row) => row.split(',')[exitedIndex])
      .map((raw) => Number.parseInt(String(raw).trim(), 10))
      .filter((val) => val === 0 || val === 1);
  } catch {
    return [];
  }
};

const computeChartStats = (results = [], actualLabels = []) => {
  if (!results.length) return null;

  const normalized = results.map((row, index) => {
    const probability = Number(row.probability) || 0;
    const predictionFlag = String(row.prediction || '').toLowerCase().includes('not') ? 0 : 1;
    const actual = actualLabels[index];
    return { probability, predictionFlag, actual };
  });

  const likely = normalized.filter((row) => row.predictionFlag === 1).length;
  const stable = normalized.length - likely;

  const barData = [
    { label: 'Likely to Churn', value: likely },
    { label: 'Not Likely', value: stable },
  ];

  const pieData = [
    { name: 'High Risk (>=0.7)', value: normalized.filter((row) => row.probability >= 0.7).length },
    { name: 'Low Risk (<0.4)', value: normalized.filter((row) => row.probability < 0.4).length },
    {
      name: 'Medium Risk (0.4-0.69)',
      value: normalized.filter((row) => row.probability >= 0.4 && row.probability < 0.7).length,
    },
  ].filter((item) => item.value > 0);

  const bins = Array.from({ length: 5 }, (_, i) => {
    const lower = i * 0.2;
    const upper = lower + 0.2;
    const count = normalized.filter((row) => row.probability >= lower && row.probability < upper).length;
    return { range: `${lower.toFixed(1)}-${upper.toFixed(1)}`, count };
  });

  const hasActualLabels = normalized.some((row) => row.actual === 0 || row.actual === 1);
  const matrix = { TP: 0, TN: 0, FP: 0, FN: 0 };

  if (hasActualLabels) {
    normalized.forEach((row) => {
      if (row.actual === 1 && row.predictionFlag === 1) matrix.TP += 1;
      if (row.actual === 0 && row.predictionFlag === 0) matrix.TN += 1;
      if (row.actual === 0 && row.predictionFlag === 1) matrix.FP += 1;
      if (row.actual === 1 && row.predictionFlag === 0) matrix.FN += 1;
    });
  }

  const rocData = hasActualLabels
    ? Array.from({ length: 11 }, (_, i) => {
        const threshold = i / 10;
        let tp = 0;
        let fp = 0;
        let tn = 0;
        let fn = 0;

        normalized.forEach((row) => {
          const pred = row.probability >= threshold ? 1 : 0;
          if (row.actual === 1 && pred === 1) tp += 1;
          if (row.actual === 0 && pred === 1) fp += 1;
          if (row.actual === 0 && pred === 0) tn += 1;
          if (row.actual === 1 && pred === 0) fn += 1;
        });

        const tpr = tp + fn ? tp / (tp + fn) : 0;
        const fpr = fp + tn ? fp / (fp + tn) : 0;
        return { threshold: threshold.toFixed(1), tpr, fpr };
      }).sort((a, b) => a.fpr - b.fpr)
    : [
        { threshold: '0.0', tpr: 0, fpr: 0 },
        { threshold: '1.0', tpr: 1, fpr: 1 },
      ];

  return { barData, pieData, bins, matrix, rocData, hasActualLabels };
};

const UploadDatasetSection = () => {
  const [file, setFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [actualLabels, setActualLabels] = useState([]);
  const [sessions, setSessions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setActualLabels([]);
      setBulkError('Only CSV files are supported.');
      return;
    }

    setFile(selectedFile);
    setBulkError('');
    setActualLabels(selectedFile ? await parseCsvActualLabels(selectedFile) : []);
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setBulkError('Please select a file.');
      return;
    }

    setBulkLoading(true);
    setBulkError('');

    try {
      const response = await bankBatchPredict(file);
      const results = response.data?.results || [];
      const stats = computeChartStats(results, actualLabels);

      const nextSession = {
        id: `${Date.now()}`,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        results,
        stats,
      };

      setSessions((prev) => [nextSession, ...prev].slice(0, 10));
    } catch (err) {
      setBulkError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const clearSavedSessions = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessions([]);
  };

  return (
    <div style={uploadStyles.wrapper}>
      <h3 style={uploadStyles.blockTitle}>Upload Dataset</h3>

      <form onSubmit={handleBulkSubmit} style={uploadStyles.form}>
        <div style={uploadStyles.uploadArea}>
          <input type="file" id="file-upload" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={uploadStyles.fileInput} />
          <label htmlFor="file-upload" style={uploadStyles.fileLabel}>
            <span style={uploadStyles.uploadIcon}>📂</span>
            {file ? file.name : 'Choose Supported File'}
          </label>
          <p style={uploadStyles.uploadHint}>Supported format: .csv/.xlsx/.xlx (max 50MB)</p>
        </div>

        <div style={uploadStyles.actionRow}>
          <button type="submit" disabled={!file || bulkLoading} style={uploadStyles.submitButton}>
            {bulkLoading ? 'Uploading...' : 'Upload Dataset'}
          </button>
          {!!sessions.length && (
            <button type="button" onClick={clearSavedSessions} style={uploadStyles.clearBtn}>
              Clear Saved Sessions
            </button>
          )}
        </div>
      </form>

      {bulkError && <div style={uploadStyles.error}>{bulkError}</div>}
      {!sessions.length && <p style={uploadStyles.emptyText}>Upload a dataset to generate charts and save session results.</p>}

      {sessions.map((session, sessionIndex) => (
        <div key={session.id} style={uploadStyles.sessionWrap}>
          <div style={uploadStyles.sessionHeader}>
            <h4 style={uploadStyles.sessionTitle}>Dataset: {session.fileName || `Session ${sessionIndex + 1}`}</h4>
            <span style={uploadStyles.sessionMeta}>{new Date(session.createdAt).toLocaleString()}</span>
          </div>

          <div style={uploadStyles.grid}>
            <div style={uploadStyles.chartCard}><h4 style={uploadStyles.cardTitle}>Bar Chart - Prediction Counts</h4><ResponsiveContainer width="100%" height={250}><BarChart data={session.stats?.barData || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={colors.accent} /></BarChart></ResponsiveContainer></div>
            <div style={uploadStyles.chartCard}><h4 style={uploadStyles.cardTitle}>Pie Chart - Risk Segments</h4><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={session.stats?.pieData || []} dataKey="value" nameKey="name" outerRadius={84} label>{(session.stats?.pieData || []).map((entry, index) => (<Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
            <div style={uploadStyles.chartCard}><h4 style={uploadStyles.cardTitle}>Histogram - Probability Distribution</h4><ResponsiveContainer width="100%" height={250}><BarChart data={session.stats?.bins || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="range" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill={colors.secondary} /></BarChart></ResponsiveContainer></div>

            <div style={uploadStyles.chartCard}>
              <h4 style={uploadStyles.cardTitle}>Confusion Matrix</h4>
              {!session.stats?.hasActualLabels && <p style={uploadStyles.warningText}>No `Exited`/label column found in CSV, matrix is unavailable.</p>}
              <div style={uploadStyles.matrixGrid}>
                <div style={uploadStyles.matrixCell}>TP: {session.stats?.matrix?.TP ?? 0}</div>
                <div style={uploadStyles.matrixCell}>FP: {session.stats?.matrix?.FP ?? 0}</div>
                <div style={uploadStyles.matrixCell}>FN: {session.stats?.matrix?.FN ?? 0}</div>
                <div style={uploadStyles.matrixCell}>TN: {session.stats?.matrix?.TN ?? 0}</div>
              </div>
            </div>

            <div style={{ ...uploadStyles.chartCard, gridColumn: '1 / -1' }}>
              <h4 style={uploadStyles.cardTitle}>ROC / AUC Curve</h4>
              {!session.stats?.hasActualLabels && <p style={uploadStyles.warningText}>Upload a CSV with actual churn labels to view ROC/AUC.</p>}
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={session.stats?.rocData || []}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="fpr" type="number" domain={[0, 1]} /><YAxis dataKey="tpr" type="number" domain={[0, 1]} /><Tooltip formatter={(val) => Number(val).toFixed(2)} /><Legend />
                  <Line type="monotone" dataKey="tpr" stroke={colors.accent} dot={false} name="ROC Curve" />
                  <Line type="monotone" dataKey="fpr" stroke={colors.muted} dot={false} name="Diagonal Baseline" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={uploadStyles.resultCard}>
            <h4 style={uploadStyles.resultTitle}>Uploaded Dataset Predictions {sessionIndex === 0 ? '(Latest)' : ''}</h4>
            <table style={uploadStyles.table}><thead><tr style={{ background: colors.lightBg }}><th style={uploadStyles.tableHeader}>Customer Name</th><th style={uploadStyles.tableHeader}>Prediction</th><th style={uploadStyles.tableHeader}>Probability</th><th style={uploadStyles.tableHeader}>Risk Level</th></tr></thead><tbody>{(session.results || []).map((row, idx) => (<tr key={`${session.id}-${row.name}-${idx}`} style={{ background: idx % 2 === 0 ? colors.white : colors.lightBg }}><td style={uploadStyles.tableCell}>{row.name}</td><td style={uploadStyles.tableCell}>{row.prediction}</td><td style={uploadStyles.tableCell}>{Number(row.probability).toFixed(3)}</td><td style={uploadStyles.tableCell}>{row.risk_level || getRiskLevel(row.probability)}</td></tr>))}</tbody></table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function BankDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  // ===== STATES FOR DATASET PREDICTION =====

const [file, setFile] = useState(null);
const [bulkLoading, setBulkLoading] = useState(false);
const [bulkError, setBulkError] = useState('');

const [actualLabels, setActualLabels] = useState([]);
const [metaRows, setMetaRows] = useState([]);

const [pendingSession, setPendingSession] = useState(null);

const [sessions, setSessions] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "[]");
  } catch {
    return [];
  }
});

// default empty stats to avoid crash
const zeroStats = {
  barData: [],
  pieData: [],
  bins: [],
  matrix: { TP: 0, TN: 0, FP: 0, FN: 0 },
  rocData: []
};

// save sessions automatically
useEffect(() => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
}, [sessions]);
  const [activeSection, setActiveSection] = useState("overview");
  const [churnData, setChurnData] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
  }, [sessions]);


  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displaySession = pendingSession || sessions[0] || { stats: zeroStats, results: [] };

  const derivedMetrics = useMemo(() => {
    const total = displaySession.results?.length || 0;
    const likely = displaySession.stats?.barData?.[0]?.value || 0;
    const notLikely = displaySession.stats?.barData?.[1]?.value || 0;
    const retention = total ? ((notLikely / total) * 100).toFixed(1) : '0.0';
    const m = displaySession.stats?.matrix || { TP: 0, TN: 0, FP: 0, FN: 0 };
    const correct = m.TP + m.TN;
    const denom = m.TP + m.TN + m.FP + m.FN;
    const accuracy = denom ? `${((correct / denom) * 100).toFixed(1)}%` : '-';
    return [
      { label: "Total Customers", value: total || '-' },
      { label: "Predicted Churn", value: likely || '-' },
      { label: "Retention Rate", value: `${retention}%` },
      { label: "Model Accuracy", value: accuracy },
    ];
  }, [displaySession]);

  const analyticsRows = useMemo(() => {
    return sessions.flatMap((s) => s.results || []);
  }, [sessions]);

  const regionData = useMemo(() => {
    const map = new Map();
    analyticsRows.forEach((r) => {
      const key = r.region || 'Unknown';
      const curr = map.get(key) || { region: key, churn: 0, total: 0 };
      curr.total += 1;
      if (String(r.prediction).includes('Likely')) curr.churn += 1;
      map.set(key, curr);
    });
    return Array.from(map.values()).map((r) => ({ region: r.region, churnRate: r.total ? Number(((r.churn / r.total) * 100).toFixed(1)) : 0 }));
  }, [analyticsRows]);

  const accountTypeData = useMemo(() => {
    const map = new Map();
    analyticsRows.forEach((r) => {
      const key = r.accountType || 'Unknown';
      const curr = map.get(key) || { type: key, churn: 0, total: 0 };
      curr.total += 1;
      if (String(r.prediction).includes('Likely')) curr.churn += 1;
      map.set(key, curr);
    });
    return Array.from(map.values()).map((r) => ({ type: r.type, churnRate: r.total ? Number(((r.churn / r.total) * 100).toFixed(1)) : 0 }));
  }, [analyticsRows]);

  const highRiskRows = useMemo(() => analyticsRows.filter((r) => Number(r.probability) >= 0.7), [analyticsRows]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && !getValidUploadType(selectedFile)) {
      setFile(null);
      setActualLabels([]);
      setMetaRows([]);
      setBulkError('Only CSV, XLSX, and XLS files are supported.');
      return;
    }

    setFile(selectedFile);
    setBulkError('');
    const parsed = selectedFile ? await parseCsvForLabelsAndMeta(selectedFile) : { labels: [], metaRows: [] };
    setActualLabels(parsed.labels);
    setMetaRows(parsed.metaRows);
  };

  const handleRunPrediction = async (e) => {
    e.preventDefault();
    if (!file) {
      setBulkError('Please select a dataset file.');
      return;
    }

    setBulkLoading(true);
    setBulkError('');

    try {
      const response = await bankBatchPredict(file);
      const rawResults = response.data?.results || [];
      const mergedResults = mapResultsWithMeta(rawResults, metaRows);
      const stats = computeChartStats(mergedResults, actualLabels);

      setPendingSession({
        id: `${Date.now()}`,
        fileName: file.name,
        createdAt: new Date().toISOString(),
        results: mergedResults,
        stats,
      });
    } catch (err) {
      setBulkError(err.response?.data?.message || err.message || 'Prediction failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const saveSessionResult = () => {
    if (!pendingSession) return;
    setSessions((prev) => [pendingSession, ...prev].slice(0, 20));
    setPendingSession(null);
  };

  const clearSavedSessions = () => {
    localStorage.removeItem(SESSION_KEY);
    setSessions([]);
    setPendingSession(null);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'predictions', label: 'Predictions', icon: '🔮' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  if (!user) {
    return <div style={styles.loaderWrapper}><p style={{ color: '#fff' }}>Loading...</p></div>;
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>FCCPS Bank</div>
        <div style={styles.userMenu}>
          <div style={styles.userIdentity}>
            {user.profileImage ? (
              <img src={user.profileImage} alt="Profile" style={styles.profileImage} />
            ) : (
              <div style={styles.avatar}>{user.name?.charAt(0).toUpperCase()}</div>
            )}
            <span style={styles.userName}>{user.name}</span>
          </div>
          <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        </div>
      </header>

      <div style={styles.mainLayout}>
        <aside style={styles.sidebar}>
          {navItems.map(item => (
            <button
              key={item.id}
              style={{ ...styles.navItem, backgroundColor: activeSection === item.id ? colors.accent : 'transparent' }}
              onClick={() => setActiveSection(item.id)}
            >
              <span style={styles.navIcon}>{item.icon}</span>{item.label}
            </button>
          ))}
        </aside>

        <main style={styles.content}>
          {activeSection === 'overview' && (
            <>
              <h2 style={styles.pageTitle}>Dashboard Overview</h2>

              <div style={styles.metricsGrid}>
                {derivedMetrics.map((metric) => (
                  <div key={metric.label} style={styles.metricCard}>
                    <p style={styles.metricLabel}>{metric.label}</p>
                    <h3 style={styles.metricValue}>{metric.value}</h3>
                  </div>
                ))}
              </div>

              <UploadDatasetSection />

          
              <div style={styles.grid}>
                <div style={styles.cardContainer}><h3 style={styles.cardTitle}>Bar Chart</h3><ResponsiveContainer width="100%" height={250}><BarChart data={displaySession.stats?.barData || zeroStats.barData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" fill={colors.accent} /></BarChart></ResponsiveContainer></div>
                <div style={styles.cardContainer}><h3 style={styles.cardTitle}>Pie Chart</h3><ResponsiveContainer width="100%" height={250}><PieChart><Pie data={displaySession.stats?.pieData || zeroStats.pieData} dataKey="value" nameKey="name" label>{(displaySession.stats?.pieData || zeroStats.pieData).map((entry, index) => (<Cell key={entry.name || index} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
                <div style={styles.cardContainer}><h3 style={styles.cardTitle}>Histogram</h3><ResponsiveContainer width="100%" height={250}><BarChart data={displaySession.stats?.bins || zeroStats.bins}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="range" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill={colors.secondary} /></BarChart></ResponsiveContainer></div>

                <div style={styles.cardContainer}>
                  <h3 style={styles.cardTitle}>Confusion Matrix</h3>
                  <div style={styles.matrixGrid}>
                    <div style={styles.matrixCell}>TP: {displaySession.stats?.matrix?.TP ?? 0}</div>
                    <div style={styles.matrixCell}>FP: {displaySession.stats?.matrix?.FP ?? 0}</div>
                    <div style={styles.matrixCell}>FN: {displaySession.stats?.matrix?.FN ?? 0}</div>
                    <div style={styles.matrixCell}>TN: {displaySession.stats?.matrix?.TN ?? 0}</div>
                  </div>
                </div>

                <div style={{ ...styles.cardContainer, gridColumn: '1 / -1' }}>
                  <h3 style={styles.cardTitle}>ROC / AUC Curve</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={displaySession.stats?.rocData || zeroStats.rocData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fpr" type="number" domain={[0, 1]} />
                      <YAxis dataKey="tpr" type="number" domain={[0, 1]} />
                      <Tooltip formatter={(v) => Number(v).toFixed(2)} />
                      <Legend />
                      <Line type="monotone" dataKey="tpr" stroke={colors.accent} dot={false} name="ROC Curve" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {activeSection === 'predictions' && <ChurnPrediction />}
          {activeSection === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h2 style={styles.pageTitle}>Analytics</h2>

              <div style={styles.grid}>
                <div style={styles.cardContainer}>
                  <h3 style={styles.cardTitle}>Region-wise Churn</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={regionData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="region" /><YAxis /><Tooltip /><Bar dataKey="churnRate" fill={colors.accent} name="Churn %" /></BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={styles.cardContainer}>
                  <h3 style={styles.cardTitle}>Account Type Churn</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={accountTypeData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" /><YAxis /><Tooltip /><Bar dataKey="churnRate" fill={colors.secondary} name="Churn %" /></BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={styles.cardContainer}>
                <h3 style={styles.cardTitle}>High-Risk Customers List</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                  <button style={styles.primaryBtn} onClick={() => exportRows(highRiskRows, 'csv', 'analytics-report')}>Export CSV</button>
                  <button style={styles.secondaryBtn} onClick={() => exportRows(highRiskRows, 'xlsx', 'analytics-report')}>Export Excel</button>
                  <button style={styles.dangerBtn} onClick={() => exportPdf(highRiskRows)}>Export PDF</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th style={styles.th}>Name</th><th style={styles.th}>Probability</th><th style={styles.th}>Region</th><th style={styles.th}>Account Type</th></tr></thead>
                    <tbody>
                      {highRiskRows.map((r, i) => (
                        <tr key={`${r.name}-${i}`}>
                          <td style={styles.td}>{r.name}</td>
                          <td style={styles.td}>{(Number(r.probability) * 100).toFixed(1)}%</td>
                          <td style={styles.td}>{r.region || 'Unknown'}</td>
                          <td style={styles.td}>{r.accountType || 'Unknown'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'settings' && <Profile />}
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },
  loaderWrapper: {
    minHeight: '100vh',
    background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    background: colors.primary,
    color: colors.white,
    padding: '16px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  logo: {
    fontSize: '1.8rem',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  userMenu: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  userIdentity: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: '1rem',
    fontWeight: 500,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: colors.accent,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 600,
    color: colors.white,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: `2px solid ${colors.accent}` ,
    objectFit: 'cover',
    background: colors.white,
  },
  logoutBtn: {
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 6,
    color: colors.white,
    cursor: 'pointer',
    fontWeight: 600,
    transition: '0.2s',
  },
  mainLayout: {
    display: 'flex',
    flex: 1,
  },
  sidebar: {
    width: 260,
    background: colors.secondary,
    padding: '24px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.1)',
  },
  navItem: {
    padding: '12px 24px',
    border: 'none',
    background: 'transparent',
    color: colors.white,
    fontSize: '1rem',
    textAlign: 'left',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: '0.2s',
    borderLeft: '4px solid transparent',
  },
  navIcon: {
    fontSize: '1.3rem',
    width: 28,
  },
  content: {
    flex: 1,
    padding: '32px',
    background: '#f1f5f9',
    overflowY: 'auto',
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: 700,
    color: colors.primary,
    marginBottom: '24px',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '30px',
  },
  metricCard: {
    background: colors.white,
    padding: '24px',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`,
  },
  metricLabel: {
    fontSize: '0.85rem',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  metricValue: {
    margin: '10px 0',
    fontSize: '1.8rem',
    fontWeight: 700,
    color: colors.primary,
  },
  cardContainer: {
    background: colors.white,
    padding: '25px',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`,
    marginBottom: 25,
  },
  cardTitle: {
    marginBottom: 20,
    fontWeight: 600,
    fontSize: '1.2rem',
    color: colors.primary,
  },
  placeholder: {
    height: 250,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: colors.lightBg,
    borderRadius: 8,
    color: colors.muted,
  },
};

const uploadStyles = {
  wrapper: { marginBottom: 25 },
  blockTitle: { margin: '0 0 12px', fontSize: '1.3rem', color: colors.primary },
  form: { padding: 20, background: colors.white, borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: `1px solid ${colors.border}` },
  uploadArea: { marginBottom: 20 }, fileInput: { display: 'none' },
  fileLabel: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: colors.lightBg, border: `2px dashed ${colors.border}`, borderRadius: 8, fontSize: '15px', color: colors.muted, cursor: 'pointer' },
  uploadIcon: { fontSize: '20px' }, uploadHint: { fontSize: '13px', color: colors.muted, marginTop: 8 },
  actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  submitButton: { padding: '12px 24px', background: colors.accent, color: colors.white, border: 'none', borderRadius: 8, fontSize: '16px', fontWeight: 600, cursor: 'pointer' },
  clearBtn: { padding: '12px 20px', background: 'transparent', color: colors.danger, border: `1px solid ${colors.danger}66`, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  error: { marginTop: 16, padding: '12px', background: colors.danger + '10', color: colors.danger, borderRadius: 8, border: `1px solid ${colors.danger}30` },
  emptyText: { margin: '12px 0', color: colors.muted, fontSize: 14 },
  sessionWrap: { background: `${colors.white}`, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16, marginBottom: 16 },
  sessionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  sessionTitle: { margin: 0, fontSize: '1rem', color: colors.primary }, sessionMeta: { fontSize: 13, color: colors.muted },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 },
  chartCard: { padding: 18, background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' },
  cardTitle: { margin: '0 0 14px 0', color: colors.primary, fontSize: '1rem' }, warningText: { margin: '0 0 12px 0', color: colors.warning, fontSize: 13 },
  matrixGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: 10 },
  matrixCell: { background: colors.lightBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 14, textAlign: 'center', fontWeight: 600, color: colors.primary },
  resultCard: { padding: 20, background: colors.white, borderRadius: 12, border: `1px solid ${colors.border}`, marginTop: 16 },
  resultTitle: { margin: '0 0 12px 0', color: colors.primary },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { padding: '8px 12px', fontWeight: 600, fontSize: '15px', borderBottom: `2px solid ${colors.border}`, color: colors.primary, textAlign: 'left' },
  tableCell: { padding: '8px 12px', fontSize: '14px', color: colors.primary, borderBottom: `1px solid ${colors.border}` },
  riskBadge: { display: 'inline-flex', alignItems: 'center', padding: '4px 10px', borderRadius: 999, fontWeight: 600, fontSize: 12 },
};
