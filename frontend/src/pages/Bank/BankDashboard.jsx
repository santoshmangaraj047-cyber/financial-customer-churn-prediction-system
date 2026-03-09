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
import { bankBatchPredict } from "../../services/api";
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

const SESSION_KEY = 'bank_prediction_chart_sessions';
const PIE_COLORS = [colors.danger, colors.success, colors.warning];

const zeroStats = {
  barData: [
    { label: 'Likely to Churn', value: 0 },
    { label: 'Not Likely', value: 0 },
  ],
  pieData: [{ name: 'No Data', value: 1 }],
  bins: [
    { range: '0.0-0.2', count: 0 },
    { range: '0.2-0.4', count: 0 },
    { range: '0.4-0.6', count: 0 },
    { range: '0.6-0.8', count: 0 },
    { range: '0.8-1.0', count: 0 },
  ],
  matrix: { TP: 0, TN: 0, FP: 0, FN: 0 },
  rocData: [
    { fpr: 0, tpr: 0 },
    { fpr: 1, tpr: 1 },
  ],
  hasActualLabels: false,
};

const normalize = (s = '') => String(s).trim().toLowerCase().replace(/[ _]/g, '');

const getValidUploadType = (file) => {
  if (!file) return false;
  const ext = `.${String(file.name || '').split('.').pop()?.toLowerCase() || ''}`;
  const validExt = ['.csv', '.xlsx', '.xls'];
  const mime = String(file.type || '').toLowerCase();
  const validMime = mime.includes('csv') || mime.includes('excel') || mime.includes('spreadsheetml');
  return validExt.includes(ext) || validMime;
};

const parseCsvForLabelsAndMeta = async (file) => {
  const ext = `.${String(file.name || '').split('.').pop()?.toLowerCase() || ''}`;
  if (ext !== '.csv') return { labels: [], metaRows: [] };

  try {
    const text = await file.text();
    const [headerLine, ...rows] = text.split(/\r?\n/).filter(Boolean);
    const headers = headerLine.split(',').map((h) => h.trim());
    const normalizedHeaders = headers.map(normalize);
    const labelIdx = normalizedHeaders.findIndex((h) => ['exited', 'churn', 'label', 'target'].includes(h));
    const regionIdx = normalizedHeaders.findIndex((h) => ['geography', 'region', 'state'].includes(h));
    const accountIdx = normalizedHeaders.findIndex((h) => ['accounttype', 'accounttype', 'account_type', 'product'].includes(h));

    const labels = [];
    const metaRows = [];

    rows.forEach((row) => {
      const cols = row.split(',');
      if (labelIdx >= 0) {
        const val = Number.parseInt(String(cols[labelIdx] || '').trim(), 10);
        if (val === 0 || val === 1) labels.push(val);
      }
      metaRows.push({
        region: regionIdx >= 0 ? (cols[regionIdx] || 'Unknown').trim() : 'Unknown',
        accountType: accountIdx >= 0 ? (cols[accountIdx] || 'Unknown').trim() : 'Unknown',
      });
    });

    return { labels, metaRows };
  } catch {
    return { labels: [], metaRows: [] };
  }
};

const computeChartStats = (results = [], actualLabels = []) => {
  if (!results.length) return zeroStats;

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

  const pieDataRaw = [
    { name: 'High Risk (>=0.7)', value: normalized.filter((row) => row.probability >= 0.7).length },
    { name: 'Medium Risk (0.4-0.69)', value: normalized.filter((row) => row.probability >= 0.4 && row.probability < 0.7).length },
    { name: 'Low Risk (<0.4)', value: normalized.filter((row) => row.probability < 0.4).length },
  ];
  const pieData = pieDataRaw.filter((item) => item.value > 0);

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
        return { fpr, tpr };
      }).sort((a, b) => a.fpr - b.fpr)
    : zeroStats.rocData;

  return { barData, pieData: pieData.length ? pieData : zeroStats.pieData, bins, matrix, rocData, hasActualLabels };
};

const mapResultsWithMeta = (results = [], metaRows = []) =>
  results.map((row, index) => ({
    ...row,
    region: row.region || metaRows[index]?.region || 'Unknown',
    accountType: row.accountType || metaRows[index]?.accountType || 'Unknown',
  }));

const getRiskLevelFromProbability = (probability) => {
  const p = Number(probability) || 0;
  if (p >= 0.7) return 'High';
  if (p >= 0.4) return 'Medium';
  return 'Low';
};

const exportRows = (rows, type = 'csv', filename = 'analytics-report') => {
  const headers = ['Customer Name', 'Prediction', 'Probability', 'Risk', 'Region', 'Account Type'];
  const dataRows = rows.map((row) => [
    row.name,
    row.prediction,
    Number(row.probability).toFixed(4),
    Number(row.probability) >= 0.7 ? 'High' : Number(row.probability) >= 0.4 ? 'Medium' : 'Low',
    row.region || 'Unknown',
    row.accountType || 'Unknown',
  ]);

  const csv = [headers, ...dataRows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blobType = type === 'xlsx'
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv;charset=utf-8;';

  const ext = type === 'xlsx' ? 'xlsx' : 'csv';
  const blob = new Blob([csv], { type: blobType });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.${ext}`;
  link.click();
  URL.revokeObjectURL(link.href);
};

const exportPdf = (rows) => {
  const html = `
    <html><head><title>Analytics Report</title></head><body>
    <h2>Analytics Report</h2>
    <table border="1" cellspacing="0" cellpadding="6">
      <tr><th>Customer</th><th>Prediction</th><th>Probability</th><th>Risk</th><th>Region</th><th>Account Type</th></tr>
      ${rows.map((r) => `<tr><td>${r.name || ''}</td><td>${r.prediction || ''}</td><td>${Number(r.probability || 0).toFixed(3)}</td><td>${Number(r.probability) >= 0.7 ? 'High' : Number(r.probability) >= 0.4 ? 'Medium' : 'Low'}</td><td>${r.region || 'Unknown'}</td><td>${r.accountType || 'Unknown'}</td></tr>`).join('')}
    </table>
    </body></html>
  `;
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }
};

export default function BankDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [activeSection, setActiveSection] = useState("overview");
  const [file, setFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [actualLabels, setActualLabels] = useState([]);
  const [metaRows, setMetaRows] = useState([]);
  const [pendingSession, setPendingSession] = useState(null);
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

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const displaySession = useMemo(() => (
    pendingSession || sessions[0] || { stats: zeroStats, results: [] }
  ), [pendingSession, sessions]);

  const derivedMetrics = useMemo(() => {
    const likely = Number(displaySession.stats?.barData?.[0]?.value || 0);
    const notLikely = Number(displaySession.stats?.barData?.[1]?.value || 0);
    const totalFromBars = likely + notLikely;
    const totalFromRows = Number(displaySession.results?.length || 0);
    const total = totalFromRows || totalFromBars;
    const retention = total ? ((notLikely / total) * 100).toFixed(1) : '0.0';

    const m = displaySession.stats?.matrix || { TP: 0, TN: 0, FP: 0, FN: 0 };
    const correct = m.TP + m.TN;
    const denom = m.TP + m.TN + m.FP + m.FN;
    const accuracy = denom ? `${((correct / denom) * 100).toFixed(1)}%` : '0.0%';

    return [
      { label: "Total Customers", value: total },
      { label: "Predicted Churn", value: likely },
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

              <div style={styles.cardContainer}>
                <h3 style={styles.cardTitle}>Upload Dataset</h3>
                <form onSubmit={handleRunPrediction}>
                  <div style={styles.uploadArea}>
                    <input type="file" id="bank-dataset-file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={styles.fileInput} />
                    <label htmlFor="bank-dataset-file" style={styles.fileLabel}>
                      <span style={styles.uploadIcon}>📁</span>
                      {file ? file.name : 'Choose CSV/XLSX/XLS file'}
                    </label>
                    <p style={styles.uploadHint}>Supported format: .csv, .xlsx, .xls</p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button style={styles.primaryBtn} type="submit" disabled={!file || bulkLoading}>{bulkLoading ? 'Processing...' : 'Upload Dataset'}</button>
                    {pendingSession && <button type="button" style={styles.secondaryBtn} onClick={saveSessionResult}>Save Session Result</button>}
                    {!!sessions.length && <button type="button" style={styles.dangerBtn} onClick={clearSavedSessions}>Clear Sessions</button>}
                  </div>
                </form>
                {bulkError && <p style={{ color: colors.danger, marginTop: 10 }}>{bulkError}</p>}
                {pendingSession && <p style={{ color: colors.warning, marginTop: 10 }}>Prediction is ready. Click "Save Session Result" to persist it.</p>}
              </div>

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

              <div style={styles.cardContainer}>
                <h3 style={styles.cardTitle}>Uploaded Dataset Predictions (Latest)</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Customer Name</th>
                        <th style={styles.th}>Prediction</th>
                        <th style={styles.th}>Risk Level</th>
                        <th style={styles.th}>Probability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(displaySession.results || []).map((row, idx) => (
                        <tr key={`${row.name}-${idx}`}>
                          <td style={styles.td}>{row.name}</td>
                          <td style={styles.td}>{row.prediction}</td>
                          <td style={styles.td}>{getRiskLevelFromProbability(row.probability)}</td>
                          <td style={styles.td}>{Number(row.probability).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
  container: { minHeight: '100vh', background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column' },
  loaderWrapper: { minHeight: '100vh', background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  header: { background: colors.primary, color: colors.white, padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' },
  logo: { fontSize: '1.8rem', fontWeight: 700, letterSpacing: '0.5px' },
  userMenu: { display: 'flex', alignItems: 'center', gap: '20px' },
  userIdentity: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  userName: { fontSize: '1rem', fontWeight: 500 },
  avatar: { width: 40, height: 40, borderRadius: '50%', background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 600, color: colors.white },
  profileImage: { width: 40, height: 40, borderRadius: '50%', border: `2px solid ${colors.accent}`, objectFit: 'cover', background: colors.white },
  logoutBtn: { padding: '8px 16px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, color: colors.white, cursor: 'pointer', fontWeight: 600 },
  mainLayout: { display: 'flex', flex: 1 },
  sidebar: { width: 260, background: colors.secondary, padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '8px' },
  navItem: { padding: '12px 24px', border: 'none', color: colors.white, fontSize: '1rem', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: 'transparent' },
  navIcon: { fontSize: '1.3rem', width: 28 },
  content: { flex: 1, padding: '32px', background: '#f1f5f9', overflowY: 'auto' },
  pageTitle: { fontSize: '2rem', fontWeight: 700, color: colors.primary, marginBottom: '24px' },
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' },
  metricCard: { background: colors.white, padding: '24px', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: `1px solid ${colors.border}` },
  metricLabel: { fontSize: '0.85rem', color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' },
  metricValue: { margin: '10px 0', fontSize: '1.8rem', fontWeight: 700, color: colors.primary },
  cardContainer: { background: colors.white, padding: '20px', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: `1px solid ${colors.border}` },
  cardTitle: { marginBottom: 14, fontWeight: 600, fontSize: '1.2rem', color: colors.primary },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 },
  matrixGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: 10 },
  matrixCell: { background: colors.lightBg, border: `1px solid ${colors.border}`, borderRadius: 8, padding: 14, textAlign: 'center', fontWeight: 600, color: colors.primary },
  primaryBtn: { padding: '10px 14px', border: 'none', borderRadius: 8, background: colors.accent, color: '#fff', cursor: 'pointer' },
  secondaryBtn: { padding: '10px 14px', border: `1px solid ${colors.accent}`, borderRadius: 8, background: '#fff', color: colors.accent, cursor: 'pointer' },
  dangerBtn: { padding: '10px 14px', border: `1px solid ${colors.danger}`, borderRadius: 8, background: '#fff', color: colors.danger, cursor: 'pointer' },
  th: { textAlign: 'left', padding: '10px', borderBottom: `2px solid ${colors.border}` },
  td: { padding: '10px', borderBottom: `1px solid ${colors.border}` },
};
