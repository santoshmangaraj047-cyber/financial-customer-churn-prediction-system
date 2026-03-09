import React, { useEffect, useState } from 'react';
import {
  adminUploadDataset,
  adminTrainModel,
  adminBatchPredict,
  adminPredictionSummary,
  getAdminModelStatus
} from '../../services/api';

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

const ModelControl = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [training, setTraining] = useState(false);
  const [trainMsg, setTrainMsg] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [summaryMsg, setSummaryMsg] = useState('');
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState('');
  const [modelStatus, setModelStatus] = useState({
    version: 'v1.0.0',
    lastTrained: '-',
    accuracy: '-',
    totalSamples: '-'
  });
  const [modelMetrics, setModelMetrics] = useState({
    precision: 0,
    recall: 0,
    f1: 0
  });

  const loadModelStatus = async () => {
    try {
      setStatusError('');
      const res = await getAdminModelStatus();
      const status = res.data?.status || {};
      setModelStatus({
        version: status.version || 'Not Trained',
        lastTrained: status.lastTrained ? new Date(status.lastTrained).toLocaleString() : '-',
        accuracy: Number.isFinite(status.accuracy) ? `${status.accuracy.toFixed(1)}%` : '-',
        totalSamples: Number.isFinite(status.totalSamples) ? status.totalSamples.toLocaleString() : '-',
        active: Boolean(status.modelExists)
      });
      setModelMetrics({
        precision: Number.isFinite(status.metrics?.precision) ? status.metrics.precision : 0,
        recall: Number.isFinite(status.metrics?.recall) ? status.metrics.recall : 0,
        f1: Number.isFinite(status.metrics?.f1) ? status.metrics.f1 : 0
      });
    } catch (err) {
      setStatusError(err.response?.data?.message || 'Could not load model status');
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    loadModelStatus();
    const timer = setInterval(loadModelStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setUploadMsg('');
    setDatasetName('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMsg('Please select a CSV, XLSX, or XLS file.');
      return;
    }
    setUploading(true);
    setUploadMsg('');
    try {
      const res = await adminUploadDataset(selectedFile);
      setUploadMsg(res.data.message || 'Dataset uploaded!');
      setDatasetName(res.data.file);
    } catch (err) {
      setUploadMsg(err.response?.data?.message || 'Upload failed.');
    }
    setUploading(false);
  };

  const handleTrain = async () => {
    if (!datasetName) {
      setTrainMsg('Please upload a dataset first.');
      return;
    }
    setTraining(true);
    setTrainMsg('');
    try {
      const res = await adminTrainModel(datasetName);
      setTrainMsg(res.data.message || 'Model trained!');
      loadModelStatus();
    } catch (err) {
      setTrainMsg(err.response?.data?.message || 'Training failed.');
    }
    setTraining(false);
  };

  const handleBatchPredict = async () => {
    if (!datasetName) {
      setSummaryMsg('Please upload a dataset first.');
      return;
    }
    setSummaryMsg('');
    try {
      const res = await adminBatchPredict(datasetName);
      setBatchResults(res.data.results || []);
      setSummaryMsg('Batch prediction complete!');
    } catch (err) {
      setSummaryMsg(err.response?.data?.message || 'Batch prediction failed.');
    }
  };

  const handleSummary = async () => {
    if (!datasetName) {
      setSummaryMsg('Please upload a dataset first.');
      return;
    }
    setSummaryMsg('');
    try {
      const res = await adminPredictionSummary(datasetName);
      setSummary(res.data.summary);
      setBatchResults(res.data.results || []);
      setSummaryMsg('Summary loaded!');
    } catch (err) {
      setSummaryMsg(err.response?.data?.message || 'Summary failed.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Model Control Center</h2>
          <p style={styles.subtitle}>
            Manage and monitor your churn prediction model
          </p>
          {statusError && <p style={{ color: colors.danger, marginTop: 8, marginBottom: 0 }}>{statusError}</p>}
          {statusLoading && <p style={{ color: colors.muted, marginTop: 8, marginBottom: 0 }}>Loading live model status...</p>}
        </div>
      </div>

      {/* Status Cards */}
      <div style={styles.statusGrid}>
        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <span style={styles.statusIcon}>🤖</span>
            <span style={styles.statusBadge(colors, modelStatus.active)}>
              {modelStatus.active ? 'Active' : 'Not Ready'}
            </span>
          </div>
          <p style={styles.statusLabel}>Model Version</p>
          <p style={styles.statusValue}>{modelStatus.version}</p>
        </div>
        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <span style={styles.statusIcon}>📅</span>
          </div>
          <p style={styles.statusLabel}>Last Trained</p>
          <p style={styles.statusValue}>{modelStatus.lastTrained}</p>
        </div>
        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <span style={styles.statusIcon}>🎯</span>
          </div>
          <p style={styles.statusLabel}>Accuracy</p>
          <p style={styles.statusValue}>{modelStatus.accuracy}</p>
        </div>
        <div style={styles.statusCard}>
          <div style={styles.statusHeader}>
            <span style={styles.statusIcon}>📊</span>
          </div>
          <p style={styles.statusLabel}>Training Samples</p>
          <p style={styles.statusValue}>{modelStatus.totalSamples}</p>
        </div>
      </div>


      {/* Main Actions */}
      <div style={styles.actionsGrid}>

        {/* Upload Dataset Card with Run Prediction */}
        <div style={styles.actionCard}>
          <h3 style={styles.actionTitle}>Upload Dataset</h3>
          <p style={styles.actionDesc}>
            Add new training data to improve model performance
          </p>
          <div style={styles.uploadArea}>
            <input
              type="file"
              id="file-upload"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              style={styles.fileInput}
            />
            <label htmlFor="file-upload" style={styles.fileLabel}>
              <span style={styles.uploadIcon}>📁</span>
              {selectedFile ? selectedFile.name : 'Choose CSV/XLSX/XLS file'}
            </label>
          </div>
          {selectedFile && (
            <button
              style={styles.secondaryButton}
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload Dataset'}
            </button>
          )}
          <button
            style={{ ...styles.secondaryButton, marginTop: 12 }}
            onClick={handleBatchPredict}
            disabled={uploading || !datasetName}
          >
            Run Prediction
          </button>
          {summaryMsg && (
            <p style={{ color: summaryMsg.includes('complete') ? colors.success : colors.danger, marginTop: 8 }}>{summaryMsg}</p>
          )}
          {uploadMsg && (
            <p style={{ color: uploadMsg.includes('success') || uploadMsg.includes('uploaded') ? colors.success : colors.danger, marginTop: 8 }}>{uploadMsg}</p>
          )}
        </div>

        {/* Train Model Card */}
        <div style={styles.actionCard}>
          <h3 style={styles.actionTitle}>Train Model</h3>
          <p style={styles.actionDesc}>
            Train the RandomForest model on the uploaded dataset
          </p>
          <button
            onClick={handleTrain}
            disabled={training}
            style={{
              ...styles.primaryButton,
              ...(training ? styles.buttonDisabled : {}),
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.primary})`
            }}
          >
            {training ? (
              <span style={styles.buttonContent}>
                <span style={styles.spinner}></span>
                Training in progress...
              </span>
            ) : (
              'Train Model'
            )}
          </button>
          {trainMsg && (
            <p style={{ color: trainMsg.includes('trained') ? colors.success : colors.danger, marginTop: 8 }}>{trainMsg}</p>
          )}
        </div>


        {/* (Batch Prediction Card removed, button moved above) */}

        {/* Prediction Summary Card */}
        <div style={styles.actionCard}>
          <h3 style={styles.actionTitle}>Prediction Summary</h3>
          <p style={styles.actionDesc}>
            View churn statistics and distribution
          </p>
          <button
            onClick={handleSummary}
            style={styles.secondaryButton}
          >
            View Summary
          </button>
          {summary && (
            <div style={{ marginTop: 12 }}>
              <p>Total Customers: <b>{summary.total}</b></p>
              <p>Likely to Churn: <b>{summary.churn}</b></p>
              <p>Not Likely to Churn: <b>{summary.notChurn}</b></p>
            </div>
          )}
        </div>
      </div>

      {/* Batch Prediction Results Table */}
      {batchResults.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={styles.metricsTitle}>Batch Prediction Results</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
            <thead>
              <tr style={{ background: colors.lightBg }}>
                <th style={{ ...styles.tableHeader, color: colors.primary }}>Customer Name</th>
                <th style={{ ...styles.tableHeader, color: colors.primary }}>Prediction</th>
                <th style={{ ...styles.tableHeader, color: colors.primary }}>Probability</th>
              </tr>
            </thead>
            <tbody>
              {batchResults.map((row, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? colors.white : colors.lightBg }}>
                  <td style={styles.tableCell}>{row.name}</td>
                  <td style={styles.tableCell}>{row.prediction}</td>
                  <td style={styles.tableCell}>{Number.isFinite(row.probability) ? row.probability.toFixed(2) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Model Metrics */}
      <div style={styles.metricsCard}>
        <h3 style={styles.metricsTitle}>Performance Metrics</h3>
        <div style={styles.metricsGrid}>
          <div style={styles.metricItem}>
            <p style={styles.metricLabel}>Precision</p>
            <p style={styles.metricValue}>{(modelMetrics.precision / 100).toFixed(2)}</p>
            <div style={styles.metricBar}>
              <div style={{...styles.metricFill, width: `${modelMetrics.precision}%`}} />
            </div>
          </div>
          <div style={styles.metricItem}>
            <p style={styles.metricLabel}>Recall</p>
            <p style={styles.metricValue}>{(modelMetrics.recall / 100).toFixed(2)}</p>
            <div style={styles.metricBar}>
              <div style={{...styles.metricFill, width: `${modelMetrics.recall}%`}} />
            </div>
          </div>
          <div style={styles.metricItem}>
            <p style={styles.metricLabel}>F1 Score</p>
            <p style={styles.metricValue}>{(modelMetrics.f1 / 100).toFixed(2)}</p>
            <div style={styles.metricBar}>
              <div style={{...styles.metricFill, width: `${modelMetrics.f1}%`}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    marginBottom: '32px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    color: colors.primary,
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: colors.muted,
    margin: 0
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  statusCard: {
    background: colors.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  statusIcon: {
    fontSize: '24px'
  },
  statusBadge: (colors, isActive = true) => ({
    padding: '4px 8px',
    background: isActive ? colors.success + '20' : colors.warning + '20',
    color: isActive ? colors.success : colors.warning,
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600'
  }),
  statusLabel: {
    fontSize: '14px',
    color: colors.muted,
    margin: '0 0 4px 0'
  },
  statusValue: {
    fontSize: '20px',
    fontWeight: '600',
    color: colors.primary,
    margin: 0
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '24px',
    marginBottom: '32px'
  },
  actionCard: {
    background: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`
  },
  actionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: colors.primary,
    margin: '0 0 8px 0'
  },
  actionDesc: {
    fontSize: '14px',
    color: colors.muted,
    margin: '0 0 20px 0',
    lineHeight: '1.5'
  },
  primaryButton: {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    color: colors.white,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    transition: '0.2s'
  },
  secondaryButton: {
    padding: '10px 20px',
    background: colors.white,
    border: `1px solid ${colors.accent}`,
    borderRadius: '8px',
    color: colors.accent,
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    width: '100%',
    marginTop: '12px',
    transition: '0.2s',
    ':hover': {
      background: colors.accent + '10'
    }
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed'
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: colors.white,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  uploadArea: {
    marginBottom: '12px'
  },
  fileInput: {
    display: 'none'
  },
  fileLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: colors.lightBg,
    border: `2px dashed ${colors.border}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.muted,
    cursor: 'pointer',
    transition: '0.2s',
    ':hover': {
      borderColor: colors.accent
    }
  },
  uploadIcon: {
    fontSize: '20px'
  },
  metricsCard: {
    background: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`
  },
  metricsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: colors.primary,
    margin: '0 0 20px 0'
  },
  metricsGrid: {
    display: 'grid',
    gap: '20px'
  },
  metricItem: {
    marginBottom: '16px'
  },
  metricLabel: {
    fontSize: '14px',
    color: colors.muted,
    margin: '0 0 4px 0'
  },
  metricValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: colors.primary,
    margin: '0 0 8px 0'
  },
  metricBar: {
    height: '8px',
    background: colors.border,
    borderRadius: '4px',
    overflow: 'hidden'
  },
  metricFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${colors.accent}, ${colors.primary})`,
    borderRadius: '4px'
  }
};

// Add global animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default ModelControl;
