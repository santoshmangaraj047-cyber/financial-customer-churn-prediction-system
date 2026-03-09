import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Prediction from '../models/Prediction.model.js';
import { logEvent } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

const ML_DIR = path.join(ROOT_DIR, 'ml');
const DATA_DIR = path.join(ROOT_DIR, 'backend', 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'backend', 'uploads');
const MODEL_PATH = path.join(ML_DIR, 'rf_model.joblib');
const MODEL_META_PATH = path.join(ML_DIR, 'model_meta.json');

const PYTHON_PATH =
  process.env.PYTHON_PATH ||
  (process.platform === 'win32'
    ? path.join(ROOT_DIR, '.venv', 'Scripts', 'python.exe')
    : path.join(ROOT_DIR, '.venv', 'bin', 'python'));

const resolvePythonCommand = () => {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  if (fs.existsSync(PYTHON_PATH)) return PYTHON_PATH;
  return process.platform === 'win32' ? 'python' : 'python3';
};

const PYTHON_CMD = resolvePythonCommand();


const SUPPORTED_DATASET_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls']);
const hasSupportedExtension = (name = '') => SUPPORTED_DATASET_EXTENSIONS.has(path.extname(name).toLowerCase());

const parsePredictionOutput = (output) => output
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((line) => {
    const [name, pred, proba, region, accountType] = line.split(',');
    return {
      name,
      prediction: pred === '1' ? 'Likely to Churn' : 'Not Likely to Churn',
      probability: Number(proba),
      region: region || 'Unknown',
      accountType: accountType || 'Unknown',
    };
  });

const formatPythonFailure = (output, fallbackMessage) => {
  if (!output) return fallbackMessage;
  if (output.includes("No module named")) {
    return `Missing Python dependency. Run: python -m pip install -r ml/requirements.txt`;
  }
  return fallbackMessage;
};

const readModelMeta = () => {
  try {
    if (!fs.existsSync(MODEL_META_PATH)) return null;
    return JSON.parse(fs.readFileSync(MODEL_META_PATH, 'utf8'));
  } catch {
    return null;
  }
};

const getRiskLevel = (probability) => {
  if (!Number.isFinite(probability)) return 'Low';
  if (probability < 0.3) return 'Low';
  if (probability < 0.6) return 'Medium';
  return 'High';
};

const storePredictions = async (userId, rows, source, datasetName = '') => {
  if (!userId || !Array.isArray(rows) || rows.length === 0) return;
  const docs = rows.map((row) => ({
    userId,
    customerName: row.name || 'Unknown',
    prediction: row.prediction,
    probability: Number(row.probability),
    risk: getRiskLevel(Number(row.probability)),
    source,
    datasetName,
  }));
  await Prediction.insertMany(docs, { ordered: false });
};

const buildModelStatus = async () => {
  const meta = readModelMeta();
  const modelExists = fs.existsSync(MODEL_PATH);
  const modelStat = modelExists ? fs.statSync(MODEL_PATH) : null;
  const totalPredictions = await Prediction.countDocuments({});
  const highRiskPredictions = await Prediction.countDocuments({ risk: 'High' });

  return {
    modelExists,
    version: modelExists ? 'rf_model.joblib' : 'Not Trained',
    lastTrained: meta?.trained_at || modelStat?.mtime || null,
    accuracy: Number.isFinite(meta?.accuracy) ? Number((meta.accuracy * 100).toFixed(1)) : null,
    totalSamples: Number.isFinite(meta?.total_samples) ? meta.total_samples : null,
    metrics: {
      precision: Number.isFinite(meta?.precision) ? Number((meta.precision * 100).toFixed(1)) : null,
      recall: Number.isFinite(meta?.recall) ? Number((meta.recall * 100).toFixed(1)) : null,
      f1: Number.isFinite(meta?.f1_score) ? Number((meta.f1_score * 100).toFixed(1)) : null,
    },
    metadata: {
      dataset: meta?.dataset || null,
      targetColumn: meta?.target_column || null,
      modelBytes: modelStat?.size || 0,
      totalPredictions,
      highRiskPredictions,
    },
  };
};

// ADMIN: Live model status
export const adminModelStatus = async (req, res) => {
  try {
    const status = await buildModelStatus();
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ADMIN: Upload dataset and train model
export const adminUploadDataset = [
  (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    next();
  },
  async (req, res) => {
    try {
      if (!hasSupportedExtension(req.file.originalname)) {
        return res.status(400).json({ success: false, message: 'Only CSV, XLSX, and XLS files are supported.' });
      }
      // Save uploaded file to data dir
      const destPath = path.join(DATA_DIR, req.file.originalname);
      fs.renameSync(req.file.path, destPath);
      res.json({ success: true, message: 'Dataset uploaded', file: req.file.originalname });
      logEvent({
        level: 'INFO',
        source: 'Model',
        message: `Dataset uploaded: ${req.file.originalname}`,
        userId: req.user?.id,
      });
    } catch (err) {
      logEvent({
        level: 'ERROR',
        source: 'Model',
        message: 'Dataset upload failed',
        details: err.message,
        userId: req.user?.id,
      });
      res.status(500).json({ success: false, message: err.message });
    }
  }
];

// ADMIN: Train model
export const adminTrainModel = async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ success: false, message: 'No dataset filename provided' });
    const datasetPath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(datasetPath)) return res.status(404).json({ success: false, message: 'Dataset not found' });
    const py = spawn(PYTHON_CMD, [path.join(ML_DIR, 'train_model.py'), datasetPath]);
    let output = '';
    py.stdout.on('data', (data) => { output += data.toString(); });
    py.stderr.on('data', (data) => { output += data.toString(); });
    py.on('close', (code) => {
      if (code === 0) {
        res.json({ success: true, message: 'Model trained', output });
        logEvent({
          level: 'INFO',
          source: 'Model',
          message: `Model trained from dataset: ${filename}`,
          userId: req.user?.id,
        });
      } else {
        const message = formatPythonFailure(output, 'Training failed');
        logEvent({
          level: 'ERROR',
          source: 'Model',
          message: `Model training failed for dataset: ${filename}`,
          details: message,
          userId: req.user?.id,
        });
        res.status(500).json({ success: false, message, output });
      }
    });
  } catch (err) {
    logEvent({
      level: 'ERROR',
      source: 'Model',
      message: 'Model training request failed',
      details: err.message,
      userId: req.user?.id,
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ADMIN: Batch prediction
export const adminBatchPredict = async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ success: false, message: 'No dataset filename provided' });
    const datasetPath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(datasetPath)) return res.status(404).json({ success: false, message: 'Dataset not found' });
    const py = spawn(PYTHON_CMD, [path.join(ML_DIR, 'predict.py'), datasetPath]);
    let output = '';
    py.stdout.on('data', (data) => { output += data.toString(); });
    py.stderr.on('data', (data) => { output += data.toString(); });
    py.on('close', (code) => {
      if (code === 0) {
        // Parse output into array
        const results = parsePredictionOutput(output);
        res.json({ success: true, results });
        logEvent({
          level: 'INFO',
          source: 'Model',
          message: `Admin batch prediction completed for dataset: ${filename}`,
          details: `Rows: ${results.length}`,
          userId: req.user?.id,
        });
      } else {
        const message = formatPythonFailure(output, 'Batch prediction failed');
        logEvent({
          level: 'ERROR',
          source: 'Model',
          message: `Admin batch prediction failed for dataset: ${filename}`,
          details: message,
          userId: req.user?.id,
        });
        res.status(500).json({ success: false, message, output });
      }
    });
  } catch (err) {
    logEvent({
      level: 'ERROR',
      source: 'Model',
      message: 'Admin batch prediction request failed',
      details: err.message,
      userId: req.user?.id,
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ADMIN: Prediction summary
export const adminPredictionSummary = async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) return res.status(400).json({ success: false, message: 'No dataset filename provided' });
    const datasetPath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(datasetPath)) return res.status(404).json({ success: false, message: 'Dataset not found' });
    const py = spawn(PYTHON_CMD, [path.join(ML_DIR, 'predict.py'), datasetPath]);
    let output = '';
    py.stdout.on('data', (data) => { output += data.toString(); });
    py.stderr.on('data', (data) => { output += data.toString(); });
    py.on('close', (code) => {
      if (code === 0) {
        const results = parsePredictionOutput(output);
        const total = results.length;
        const churn = results.filter(r => r.prediction === 'Likely to Churn').length;
        const notChurn = total - churn;
        res.json({ success: true, summary: { total, churn, notChurn }, results });
        logEvent({
          level: 'INFO',
          source: 'Model',
          message: `Admin prediction summary generated: ${filename}`,
          details: `Total=${total}, Churn=${churn}, NotChurn=${notChurn}`,
          userId: req.user?.id,
        });
      } else {
        const message = formatPythonFailure(output, 'Summary failed');
        logEvent({
          level: 'ERROR',
          source: 'Model',
          message: `Admin summary failed for dataset: ${filename}`,
          details: message,
          userId: req.user?.id,
        });
        res.status(500).json({ success: false, message, output });
      }
    });
  } catch (err) {
    logEvent({
      level: 'ERROR',
      source: 'Model',
      message: 'Admin summary request failed',
      details: err.message,
      userId: req.user?.id,
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

// BANK: Single prediction
export const bankSinglePredict = async (req, res) => {
  try {
    const input = req.body;
    const py = spawn(PYTHON_CMD, [path.join(ML_DIR, 'predict.py'), '-'], { stdio: ['pipe', 'pipe', 'pipe'] });
    py.stdin.write(JSON.stringify(input));
    py.stdin.end();
    let output = '';
    py.stdout.on('data', (data) => { output += data.toString(); });
    py.stderr.on('data', (data) => { output += data.toString(); });
    py.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          const prediction = result.prediction === 1 ? 'Likely to Churn' : 'Not Likely to Churn';
          const probability = Number(result.probability);

          storePredictions(
            req.user?.id,
            [{ name: input?.name || input?.customerName || input?.customerId || 'Single Prediction', prediction, probability }],
            'single'
          ).catch((err) => console.warn('Prediction history save failed:', err.message));

          logEvent({
            level: 'INFO',
            source: 'Prediction',
            message: 'Bank single prediction completed',
            details: `${prediction} (${(probability * 100).toFixed(1)}%)`,
            userId: req.user?.id,
          });

          res.json({ success: true, prediction, probability });
        } catch (e) {
          logEvent({
            level: 'ERROR',
            source: 'Prediction',
            message: 'Invalid single prediction output',
            details: e.message,
            userId: req.user?.id,
          });
          res.status(500).json({ success: false, message: 'Invalid prediction output', output });
        }
      } else {
        const message = formatPythonFailure(output, 'Prediction failed');
        logEvent({
          level: 'ERROR',
          source: 'Prediction',
          message: 'Bank single prediction failed',
          details: message,
          userId: req.user?.id,
        });
        res.status(500).json({ success: false, message, output });
      }
    });
  } catch (err) {
    logEvent({
      level: 'ERROR',
      source: 'Prediction',
      message: 'Bank single prediction request failed',
      details: err.message,
      userId: req.user?.id,
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

// BANK: Batch prediction
export const bankBatchPredict = async (req, res) => {
  try {
    const csvPath = req.file?.path || (req.body?.filename ? path.join(UPLOADS_DIR, req.body.filename) : null);
    if (!csvPath || !fs.existsSync(csvPath)) {
      return res.status(404).json({ success: false, message: 'Dataset file not found' });
    }

    const sourceName = req.file?.originalname || req.body?.filename || req.file?.filename || '';
    if (sourceName && !hasSupportedExtension(sourceName)) {
      return res.status(400).json({ success: false, message: 'Only CSV, XLSX, and XLS files are supported.' });
    }

    const py = spawn(PYTHON_CMD, [path.join(ML_DIR, 'predict.py'), csvPath]);
    let output = '';
    py.stdout.on('data', (data) => { output += data.toString(); });
    py.stderr.on('data', (data) => { output += data.toString(); });
    py.on('close', (code) => {
      if (code === 0) {
        const results = parsePredictionOutput(output);

        storePredictions(req.user?.id, results, 'batch', req.file?.originalname || req.body?.filename || '')
          .catch((err) => console.warn('Batch prediction history save failed:', err.message));

        logEvent({
          level: 'INFO',
          source: 'Prediction',
          message: 'Bank batch prediction completed',
          details: `Rows: ${results.length}`,
          userId: req.user?.id,
          metadata: { dataset: req.file?.originalname || req.body?.filename || '' },
        });

        res.json({ success: true, results });
      } else {
        const message = formatPythonFailure(output, 'Batch prediction failed');
        logEvent({
          level: 'ERROR',
          source: 'Prediction',
          message: 'Bank batch prediction failed',
          details: message,
          userId: req.user?.id,
          metadata: { dataset: req.file?.originalname || req.body?.filename || '' },
        });
        res.status(500).json({ success: false, message, output });
      }

      // Remove temp upload written by multer for bank flow.
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    });
  } catch (err) {
    logEvent({
      level: 'ERROR',
      source: 'Prediction',
      message: 'Bank batch prediction request failed',
      details: err.message,
      userId: req.user?.id,
    });
    res.status(500).json({ success: false, message: err.message });
  }
};

// BANK: Prediction history
export const bankPredictionHistory = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const predictions = await Prediction.find({ userId: req.user?.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, predictions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
