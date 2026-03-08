import React, { useState, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { getChurnDistribution } from "../../services/api";
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

export default function BankDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [activeSection, setActiveSection] = useState("overview");
  const [churnData, setChurnData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);


  useEffect(() => {
    const fetchChurnDistribution = async () => {
      try {
        const res = await getChurnDistribution();
        setChurnData(res.data.distribution || []);
      } catch (error) {
        console.error("Churn distribution fetch failed:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchChurnDistribution();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const metrics = useMemo(() => [
    { label: "Total Customers", value: "2,543", change: "+12%" },
    { label: "Predicted Churn", value: "342", change: "+5%" },
    { label: "Retention Rate", value: "86.5%", change: "+3%" },
    { label: "Model Accuracy", value: "94.2%", change: "+2%" },
  ], []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'predictions', label: 'Predictions', icon: '🔮' },
    { id: 'analytics', label: 'Analytics', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  if (!user) {
    return (
      <div style={styles.loaderWrapper}>
        <p style={{ color: '#fff' }}>Loading...</p>
      </div>
    );
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
              style={{
                ...styles.navItem,
                backgroundColor: activeSection === item.id ? colors.accent : 'transparent'
              }}
              onClick={() => setActiveSection(item.id)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = activeSection === item.id ? colors.accent : 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = activeSection === item.id ? colors.accent : 'transparent'}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        <main style={styles.content}>
          {activeSection === 'overview' && (
            <>
              <h2 style={styles.pageTitle}>Dashboard Overview</h2>
              <div style={styles.metricsGrid}>
                {metrics.map((metric) => (
                  <div key={metric.label} style={styles.metricCard}>
                    <p style={styles.metricLabel}>{metric.label}</p>
                    <h3 style={styles.metricValue}>{metric.value}</h3>
                    <p style={{
                      color: metric.change.includes('+') ? colors.success : colors.danger,
                      fontSize: '0.85rem',
                      fontWeight: 600
                    }}>
                      {metric.change} from last month
                    </p>
                  </div>
                ))}
              </div>

              <div style={styles.cardContainer}>
                <h3 style={styles.cardTitle}>Churn Distribution</h3>
                {loading ? <p>Loading chart...</p> : <ChurnChart data={churnData} />}
              </div>

              <div style={styles.cardContainer}>
                <h3 style={styles.cardTitle}>Model Performance</h3>
                <div style={styles.placeholder}>📈 Line Chart Placeholder</div>
              </div>
            </>
          )}

          {activeSection === 'predictions' && <ChurnPrediction />}
          {activeSection === 'analytics' && (
            <div style={styles.placeholder}>
              <h2>Analytics</h2>
              <p>Advanced analytics coming soon.</p>
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