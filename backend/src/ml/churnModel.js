import * as tf from '@tensorflow/tfjs';
import { generateTrainingData } from './trainData.js';

let model = null;

// Normalize features (scale to 0–1)
const normalize = (features) => {
  const maxVals = [72, 130, 1, 9];  // max values for each feature
  return features.map((val, i) => val / maxVals[i]);
};

// Build and train the model
export const trainModel = async () => {
  console.log('🔄 Training churn prediction model...');
  
  // Generate synthetic dataset
  const dataset = generateTrainingData();
  const xs = dataset.map(d => normalize(d.features));
  const ys = dataset.map(d => d.label);

  // Convert to tensors
  const inputTensor = tf.tensor2d(xs, [xs.length, 4]);
  const labelTensor = tf.tensor2d(ys, [ys.length, 1]);

  // Define logistic regression model
  model = tf.sequential();
  model.add(tf.layers.dense({
    inputShape: [4],
    units: 1,
    activation: 'sigmoid',
    kernelRegularizer: tf.regularizers.l2({ l2: 0.001 })
  }));

  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });

  // Train
  await model.fit(inputTensor, labelTensor, {
    epochs: 50,
    batchSize: 32,
    validationSplit: 0.2,
    verbose: 0
  });

  console.log('✅ Model training complete!');
  return model;
};

// Predict churn probability for a single customer
export const predictChurn = async (customerFeatures) => {
  if (!model) {
    model = await trainModel(); // lazy training
  }
  const normalized = normalize(customerFeatures);
  const input = tf.tensor2d([normalized], [1, 4]);
  const prediction = model.predict(input);
  const probability = (await prediction.data())[0];
  return probability;
};

// Get churn risk level based on probability
export const getRiskLevel = (probability) => {
  if (probability < 0.3) return 'Low';
  if (probability < 0.6) return 'Medium';
  return 'High';
};

// Initialize model on server start (optional)
export const initModel = async () => {
  if (!model) {
    model = await trainModel();
  }
  return model;
};