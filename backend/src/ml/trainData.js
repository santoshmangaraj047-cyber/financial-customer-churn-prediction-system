// Synthetic dataset for churn prediction
export const generateTrainingData = () => {
  const data = [];
  for (let i = 0; i < 1000; i++) {
    // Features: tenure (months), monthly charges ($), contract (0=monthly,1=yearly), support calls
    const tenure = Math.floor(Math.random() * 72) + 1;        // 1–72 months
    const monthlyCharges = Math.floor(Math.random() * 100) + 30; // $30–130
    const contract = Math.random() > 0.5 ? 1 : 0;            // 0 = monthly, 1 = yearly
    const supportCalls = Math.floor(Math.random() * 10);      // 0–9 calls

    // Simple rule to generate churn label (1 = churn, 0 = not churn)
    // Higher chance if: low tenure, high monthly charges, monthly contract, high support calls
    let churnProb = 0;
    churnProb += (tenure < 12) ? 0.3 : 0;
    churnProb += (monthlyCharges > 80) ? 0.3 : 0;
    churnProb += (contract === 0) ? 0.2 : 0;
    churnProb += (supportCalls > 5) ? 0.2 : 0;
    churnProb = Math.min(churnProb, 0.95); // cap at 95%

    const churn = Math.random() < churnProb ? 1 : 0;

    data.push({
      features: [tenure, monthlyCharges, contract, supportCalls],
      label: churn
    });
  }
  return data;
};