import React from 'react';
import PredictionHistory from './PredictionHistory';

const colors = {
  primary: '#001845',
  white: '#ffffff',
  border: '#e2e8f0'
};

const ChurnPrediction = () => {
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Prediction History</h2>
      <PredictionHistory />
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  title: {
    margin: 0,
    padding: 20,
    borderRadius: 12,
    background: colors.white,
    border: `1px solid ${colors.border}`,
    color: colors.primary,
    fontSize: '1.8rem',
    fontWeight: 600,
  },
};

export default ChurnPrediction;
