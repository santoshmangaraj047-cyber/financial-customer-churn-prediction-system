import React, { useMemo, useState } from 'react';
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
import { bankBatchPredict } from '../../services/api';
import PredictionHistory from './PredictionHistory';

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

const ChurnPrediction = () => {
  const [file, setFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkError, setBulkError] = useState('');
  const [actualLabels, setActualLabels] = useState([]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && !selectedFile.name.toLowerCase().endsWith('.csv')) {
      setFile(null);
      setBulkResult(null);
      setActualLabels([]);
      setBulkError('Only CSV files are supported.');
      return;
    }

    setFile(selectedFile);
    setBulkResult(null);
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
    setBulkResult(null);

    try {
      const response = await bankBatchPredict(file);
      setBulkResult(response.data);
    } catch (err) {
      setBulkError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setBulkLoading(false);
    }
  };

  const chartStats = useMemo(() => {
    const results = bulkResult?.results || [];
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
          { threshold: '1.0', tpr: 0, fpr: 0 },
        ];

    return { barData, pieData, bins, matrix, rocData, hasActualLabels };
  }, [bulkResult, actualLabels]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Predictions</h2>

      <form onSubmit={handleBulkSubmit} style={styles.form}>
        <div style={styles.uploadArea}>
          <input
            type="file"
            id="file-upload"
            accept=".csv"
            onChange={handleFileChange}
            style={styles.fileInput}
          />
          <label htmlFor="file-upload" style={styles.fileLabel}>
            <span style={styles.uploadIcon}>📁</span>
            {file ? file.name : 'Choose CSV file'}
          </label>
          <p style={styles.uploadHint}>Supported format: .csv (max 50MB)</p>
        </div>

        <button type="submit" disabled={!file || bulkLoading} style={styles.submitButton}>
          {bulkLoading ? 'Uploading...' : 'Upload Dataset'}
        </button>
      </form>

      {bulkError && <div style={styles.error}>{bulkError}</div>}

      {bulkResult?.results?.length > 0 && (
        <>
          <div style={styles.grid}>
            <div style={styles.chartCard}>
              <h3 style={styles.cardTitle}>Bar Chart - Prediction Counts</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartStats?.barData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill={colors.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.cardTitle}>Pie Chart - Risk Segments</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartStats?.pieData || []} dataKey="value" nameKey="name" outerRadius={84} label>
                    {(chartStats?.pieData || []).map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.cardTitle}>Histogram - Probability Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartStats?.bins || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={colors.secondary} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={styles.chartCard}>
              <h3 style={styles.cardTitle}>Confusion Matrix</h3>
              {!chartStats?.hasActualLabels && (
                <p style={styles.warningText}>No `Exited`/label column found in CSV, matrix is unavailable.</p>
              )}
              <div style={styles.matrixGrid}>
                <div style={styles.matrixCell}>TP: {chartStats?.matrix.TP ?? 0}</div>
                <div style={styles.matrixCell}>FP: {chartStats?.matrix.FP ?? 0}</div>
                <div style={styles.matrixCell}>FN: {chartStats?.matrix.FN ?? 0}</div>
                <div style={styles.matrixCell}>TN: {chartStats?.matrix.TN ?? 0}</div>
              </div>
            </div>

            <div style={{ ...styles.chartCard, gridColumn: '1 / -1' }}>
              <h3 style={styles.cardTitle}>ROC / AUC Curve</h3>
              {!chartStats?.hasActualLabels && (
                <p style={styles.warningText}>Upload a CSV with actual churn labels to view ROC/AUC.</p>
              )}
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartStats?.rocData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fpr" type="number" domain={[0, 1]} />
                  <YAxis dataKey="tpr" type="number" domain={[0, 1]} />
                  <Tooltip formatter={(val) => Number(val).toFixed(2)} />
                  <Legend />
                  <Line type="monotone" dataKey="tpr" stroke={colors.accent} dot={false} name="ROC Curve" />
                  <Line
                    type="monotone"
                    dataKey="fpr"
                    stroke={colors.muted}
                    dot={false}
                    name="Diagonal Baseline"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={styles.resultCard}>
            <h3 style={styles.resultTitle}>Uploaded Dataset Predictions</h3>
            <table style={styles.table}>
              <thead>
                <tr style={{ background: colors.lightBg }}>
                  <th style={styles.tableHeader}>Customer Name</th>
                  <th style={styles.tableHeader}>Prediction</th>
                  <th style={styles.tableHeader}>Probability</th>
                </tr>
              </thead>
              <tbody>
                {bulkResult.results.map((row, idx) => (
                  <tr key={`${row.name}-${idx}`} style={{ background: idx % 2 === 0 ? colors.white : colors.lightBg }}>
                    <td style={styles.tableCell}>{row.name}</td>
                    <td style={styles.tableCell}>{row.prediction}</td>
                    <td style={styles.tableCell}>{Number(row.probability).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={styles.historyWrap}>
        <PredictionHistory />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 22,
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 600,
    color: colors.primary,
    margin: 0,
  },
  form: {
    padding: 20,
    background: colors.white,
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`,
  },
  uploadArea: { marginBottom: 20 },
  fileInput: { display: 'none' },
  fileLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: colors.lightBg,
    border: `2px dashed ${colors.border}`,
    borderRadius: 8,
    fontSize: '15px',
    color: colors.muted,
    cursor: 'pointer',
  },
  uploadIcon: { fontSize: '20px' },
  uploadHint: { fontSize: '13px', color: colors.muted, marginTop: 8 },
  submitButton: {
    padding: '12px 24px',
    background: colors.accent,
    color: colors.white,
    border: 'none',
    borderRadius: 8,
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    marginTop: 16,
    padding: '12px',
    background: colors.danger + '10',
    color: colors.danger,
    borderRadius: 8,
    border: `1px solid ${colors.danger}30`,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 16,
  },
  chartCard: {
    padding: 18,
    background: colors.white,
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  },
  cardTitle: {
    margin: '0 0 14px 0',
    color: colors.primary,
    fontSize: '1rem',
  },
  warningText: {
    margin: '0 0 12px 0',
    color: colors.warning,
    fontSize: 13,
  },
  matrixGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))',
    gap: 10,
  },
  matrixCell: {
    background: colors.lightBg,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: 14,
    textAlign: 'center',
    fontWeight: 600,
    color: colors.primary,
  },
  resultCard: {
    padding: 20,
    background: colors.white,
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
  },
  resultTitle: {
    margin: '0 0 12px 0',
    color: colors.primary,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    padding: '8px 12px',
    fontWeight: 600,
    fontSize: '15px',
    borderBottom: `2px solid ${colors.border}`,
    color: colors.primary,
    textAlign: 'left',
  },
  tableCell: {
    padding: '8px 12px',
    fontSize: '14px',
    color: colors.primary,
    borderBottom: `1px solid ${colors.border}`,
  },
  historyWrap: {
    marginTop: 4,
  },
};

export default ChurnPrediction;
