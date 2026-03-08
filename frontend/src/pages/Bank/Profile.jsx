import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const colors = {
  primary: '#001845',
  secondary: '#023E7D',
  accent: '#0466C8',
  muted: '#5C677D',
  white: '#ffffff',
  lightBg: '#f8fafc',
  border: '#e2e8f0',
  success: '#10b981',
  danger: '#ef4444'
};

const Profile = () => {
  const { user, updateUserProfile } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload a valid image file.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateUserProfile({ profileImage: reader.result });
      setMessage({ type: 'success', text: 'Profile picture updated.' });
    };
    reader.readAsDataURL(selected);
  };

  const removeImage = () => {
    updateUserProfile({ profileImage: '' });
    setMessage({ type: 'success', text: 'Profile picture removed.' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      setLoading(false);
      return;
    }

    setTimeout(() => {
      updateUserProfile({ name: formData.name });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setLoading(false);
    }, 700);
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Profile Settings</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.imageSection}>
          {user?.profileImage ? (
            <img src={user.profileImage} alt="Profile" style={styles.profileImage} />
          ) : (
            <div style={styles.avatar}>{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
          )}
          <div style={styles.imageControls}>
            <label htmlFor="profile-image-upload" style={styles.imageUploadBtn}>Update profile pic</label>
            <input
              id="profile-image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            {user?.profileImage && (
              <button type="button" onClick={removeImage} style={styles.removeBtn}>Remove</button>
            )}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <h3 style={styles.sectionTitle}>Change Password</h3>
        <div style={styles.formGroup}>
          <label style={styles.label}>Current Password</label>
          <input
            type="password"
            name="currentPassword"
            value={formData.currentPassword}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>New Password</label>
          <input
            type="password"
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            style={styles.input}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            style={styles.input}
          />
        </div>

        {message.text && (
          <div style={{
            ...styles.message,
            ...(message.type === 'success' ? styles.successMsg : styles.errorMsg)
          }}>
            {message.text}
          </div>
        )}

        <button type="submit" disabled={loading} style={styles.submitButton}>
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
};

const styles = {
  container: {
    padding: 20,
    background: colors.white,
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border}`,
    maxWidth: 600,
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 24,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  imageSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 8,
    borderBottom: `1px solid ${colors.border}`,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: '50%',
    background: colors.accent,
    color: colors.white,
    fontSize: 28,
    fontWeight: 700,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 62,
    height: 62,
    borderRadius: '50%',
    objectFit: 'cover',
    border: `2px solid ${colors.accent}`,
  },
  imageControls: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  imageUploadBtn: {
    cursor: 'pointer',
    color: colors.accent,
    fontWeight: 600,
    fontSize: 14,
  },
  removeBtn: {
    border: 'none',
    background: 'transparent',
    color: colors.danger,
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
    padding: 0,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    fontSize: '15px',
    outline: 'none',
  },
  sectionTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: colors.primary,
    marginTop: 8,
    marginBottom: 8,
  },
  submitButton: {
    padding: '12px 24px',
    background: colors.accent,
    color: colors.white,
    border: 'none',
    borderRadius: 8,
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 8,
  },
  message: {
    padding: '12px',
    borderRadius: 8,
    fontSize: '14px',
  },
  successMsg: {
    background: colors.success + '10',
    color: colors.success,
    border: `1px solid ${colors.success}30`,
  },
  errorMsg: {
    background: colors.danger + '10',
    color: colors.danger,
    border: `1px solid ${colors.danger}30`,
  },
};

export default Profile;
