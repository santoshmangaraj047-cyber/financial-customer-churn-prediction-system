import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // ✅ relative path

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 880);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 880);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const colors = {
    bgStart: '#001845',
    bgMid: '#023E7D',
    accent: '#0466C8',
    muted: '#5C677D',
    cardBg: 'rgba(255, 255, 255, 0.98)',
    lightBg: '#f8f9ff',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
  };

  const containerStyle = {
    minHeight: '100vh',
    margin: 0,
    padding: 0,
    fontFamily: 'Nunito, Arial, Helvetica, sans-serif',
    background: `linear-gradient(135deg, ${colors.bgStart}, ${colors.bgMid})`,
    display: 'flex',
    flexDirection: 'column'
  };

  const headerStyle = {
    background: colors.bgStart,
    color: '#fff',
    padding: isMobile ? '16px 20px' : '20px 40px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16
  };

  const logoStyle = {
    fontSize: '1.8rem',
    fontWeight: 700,
    fontFamily: "Gill Sans, 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif",
    margin: 0
  };

  const userInfoStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap'
  };

  const avatarStyle = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: colors.accent,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#fff'
  };

  const logoutBtnStyle = {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.3)',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    transition: '0.3s ease'
  };

  const mainContentStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    gap: 0
  };

  const sidebarStyle = {
    width: isMobile ? '100%' : 250,
    background: colors.bgMid,
    color: '#fff',
    padding: isMobile ? '16px' : '30px 20px',
    borderRight: isMobile ? 'none' : `1px solid rgba(255, 255, 255, 0.1)`,
    borderBottom: isMobile ? `1px solid rgba(255, 255, 255, 0.1)` : 'none',
    display: 'flex',
    flexDirection: isMobile ? 'row' : 'column',
    gap: 8,
    overflowX: isMobile ? 'auto' : 'hidden'
  };

  const navItemStyle = (isActive) => ({
    padding: '12px 16px',
    borderRadius: 8,
    cursor: 'pointer',
    background: isActive ? colors.accent : 'transparent',
    color: '#fff',
    border: 'none',
    fontSize: '0.95rem',
    fontWeight: 500,
    transition: '0.3s ease',
    whiteSpace: 'nowrap',
    textAlign: 'left'
  });

  const contentStyle = {
    flex: 1,
    padding: isMobile ? '20px' : '40px 30px',
    overflowY: 'auto'
  };

  const sectionTitleStyle = {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#fff',
    marginBottom: 24,
    fontFamily: 'Montserrat, "Lato", sans-serif'
  };

  const metricsGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 20,
    marginBottom: 36
  };

  const metricCardStyle = {
    background: colors.cardBg,
    padding: '24px',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    transition: '0.3s ease',
    cursor: 'pointer',
    border: '1px solid #e9edf6'
  };

  const metricLabelStyle = {
    fontSize: '0.85rem',
    color: colors.muted,
    marginBottom: 8,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const metricValueStyle = {
    fontSize: '2rem',
    fontWeight: 700,
    color: colors.bgStart,
    marginBottom: 8
  };

  const metricChangeStyle = (isPositive) => ({
    fontSize: '0.85rem',
    color: isPositive ? colors.success : colors.danger,
    fontWeight: 600
  });

  const dataTableStyle = {
    background: colors.cardBg,
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    marginBottom: 24
  };

  const tableHeaderStyle = {
    background: colors.bgStart,
    color: '#fff',
    padding: '16px 20px',
    fontSize: '0.95rem',
    fontWeight: 600,
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 12,
    borderBottom: `1px solid #e9edf6`
  };

  const tableRowStyle = {
    padding: '14px 20px',
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 12,
    borderBottom: `1px solid #e9edf6`,
    alignItems: 'center',
    fontSize: '0.9rem'
  };

  const statusBadgeStyle = (status) => ({
    padding: '4px 12px',
    borderRadius: 20,
    fontSize: '0.8rem',
    fontWeight: 600,
    textAlign: 'center',
    background: status === 'Low' ? '#d1fae5' : status === 'Medium' ? '#fef3c7' : '#fee2e2',
    color: status === 'Low' ? '#065f46' : status === 'Medium' ? '#92400e' : '#991b1b'
  });

  const chartContainerStyle = {
    background: colors.cardBg,
    borderRadius: 12,
    padding: '24px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    marginBottom: 24
  };

  const chartPlaceholderStyle = {
    width: '100%',
    height: 280,
    background: colors.lightBg,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.muted,
    fontSize: '1rem',
    fontWeight: 500
  };

  const metrics = [
    { label: 'Total Customers', value: '2,543', change: '+12%' },
    { label: 'Predicted Churn', value: '342', change: '+5%' },
    { label: 'Retention Rate', value: '86.5%', change: '+3%' },
    { label: 'Model Accuracy', value: '94.2%', change: '+2%' }
  ];

  const customerData = [
    { id: 'C001', name: 'John Smith', monthlyCharges: '$65', riskLevel: 'Low', prediction: 'Stable' },
    { id: 'C002', name: 'Sarah Johnson', monthlyCharges: '$89', riskLevel: 'Medium', prediction: 'At Risk' },
    { id: 'C003', name: 'Mike Chen', monthlyCharges: '$45', riskLevel: 'High', prediction: 'High Risk' },
    { id: 'C004', name: 'Emily Davis', monthlyCharges: '$120', riskLevel: 'Low', prediction: 'Stable' },
    { id: 'C005', name: 'David Wilson', monthlyCharges: '$72', riskLevel: 'Medium', prediction: 'At Risk' }
  ];

  if (!user) {
    return (
      <div style={containerStyle}>
        <p style={{ color: '#fff', textAlign: 'center', marginTop: '50px' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <h1 style={logoStyle}>FCCPS</h1>
        <div style={userInfoStyle}>
          <div style={{ textAlign: isMobile ? 'center' : 'right' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.95rem' }}>Welcome back</p>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
  {user?.name || user?.email?.split('@')[0] || 'User'}
</p>
          </div>
          <div style={avatarStyle}>{user.name?.charAt(0).toUpperCase()}</div>
          <button
            style={logoutBtnStyle}
            onMouseEnter={(e) => (e.target.style.background = 'rgba(255, 255, 255, 0.2)')}
            onMouseLeave={(e) => (e.target.style.background = 'transparent')}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <div style={mainContentStyle}>
        <aside style={sidebarStyle}>
          {['📊 Overview', '👥 Customers', '🔮 Predictions', '📈 Analytics', '⚙️ Settings'].map((item, idx) => {
            const section = item.split(' ')[1].toLowerCase();
            return (
              <button
                key={idx}
                style={navItemStyle(activeSection === section)}
                onClick={() => setActiveSection(section)}
                onMouseEnter={(e) =>
                  !activeSection.includes(section) &&
                  (e.target.style.background = 'rgba(4, 102, 200, 0.2)')
                }
                onMouseLeave={(e) =>
                  !activeSection.includes(section) &&
                  (e.target.style.background = 'transparent')
                }
              >
                {item}
              </button>
            );
          })}
        </aside>

        <div style={contentStyle}>
          {activeSection === 'overview' && (
            <>
              <h2 style={sectionTitleStyle}>Dashboard Overview</h2>

              <div style={metricsGridStyle}>
                {metrics.map((metric, idx) => (
                  <div
                    key={idx}
                    style={metricCardStyle}
                    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)')}
                    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)')}
                  >
                    <div style={metricLabelStyle}>{metric.label}</div>
                    <div style={metricValueStyle}>{metric.value}</div>
                    <div style={metricChangeStyle(metric.change.includes('+') && metric.label !== 'Predicted Churn')}>
                      {metric.change} {metric.label !== 'Predicted Churn' ? '↑' : '↑'} from last month
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 36 }}>
                <div style={chartContainerStyle}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: colors.bgStart, fontWeight: 600 }}>
                    Churn Distribution
                  </h3>
                  <div style={chartPlaceholderStyle}>📊 Donut Chart Placeholder</div>
                </div>
                <div style={chartContainerStyle}>
                  <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: colors.bgStart, fontWeight: 600 }}>
                    Model Performance
                  </h3>
                  <div style={chartPlaceholderStyle}>📈 Line Chart Placeholder</div>
                </div>
              </div>

              <h3 style={{ fontSize: '1.3rem', color: '#fff', marginBottom: 16, fontWeight: 600 }}>Recent Predictions</h3>
              <div style={dataTableStyle}>
                {isMobile ? (
                  <div>
                    {customerData.map((customer, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '16px 20px',
                          borderBottom: idx < customerData.length - 1 ? `1px solid #e9edf6` : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, color: colors.bgStart }}>{customer.name}</div>
                          <div style={statusBadgeStyle(customer.riskLevel)}>{customer.riskLevel}</div>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: colors.muted, marginBottom: 4 }}>
                          ID: {customer.id} • Monthly: {customer.monthlyCharges}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: colors.accent, fontWeight: 500 }}>
                          Prediction: {customer.prediction}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div style={tableHeaderStyle}>
                      <div>Customer Name</div>
                      <div>ID</div>
                      <div>Monthly Charges</div>
                      <div>Risk Level</div>
                      <div>Prediction</div>
                    </div>
                    {customerData.map((customer, idx) => (
                      <div key={idx} style={tableRowStyle}>
                        <div style={{ fontWeight: 600, color: colors.bgStart }}>{customer.name}</div>
                        <div style={{ color: colors.muted }}>{customer.id}</div>
                        <div style={{ fontWeight: 500 }}>{customer.monthlyCharges}</div>
                        <div><span style={statusBadgeStyle(customer.riskLevel)}>{customer.riskLevel}</span></div>
                        <div
                          style={{
                            color: customer.prediction === 'Stable' ? colors.success : customer.prediction === 'At Risk' ? colors.warning : colors.danger,
                            fontWeight: 600
                          }}
                        >
                          {customer.prediction}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}

          {activeSection === 'customers' && (
            <div>
              <h2 style={sectionTitleStyle}>Customer Management</h2>
              <div style={{ background: colors.cardBg, padding: '40px', borderRadius: 12, textAlign: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
                <p style={{ fontSize: '1.1rem', color: colors.muted }}>👥 Complete customer database management interface coming soon...</p>
              </div>
            </div>
          )}

          {activeSection === 'predictions' && (
            <div>
              <h2 style={sectionTitleStyle}>Churn Predictions</h2>
              <div style={{ background: colors.cardBg, padding: '40px', borderRadius: 12, textAlign: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
                <p style={{ fontSize: '1.1rem', color: colors.muted }}>🔮 Advanced prediction analytics coming soon...</p>
              </div>
            </div>
          )}

          {activeSection === 'analytics' && (
            <div>
              <h2 style={sectionTitleStyle}>Analytics & Reports</h2>
              <div style={{ background: colors.cardBg, padding: '40px', borderRadius: 12, textAlign: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
                <p style={{ fontSize: '1.1rem', color: colors.muted }}>📈 Detailed analytics and reporting tools coming soon...</p>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div>
              <h2 style={sectionTitleStyle}>Settings</h2>
              <div style={{ background: colors.cardBg, padding: '40px', borderRadius: 12, textAlign: 'center', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
                <p style={{ fontSize: '1.1rem', color: colors.muted }}>⚙️ User preferences and settings coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}