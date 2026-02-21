import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, fileAPI } from '../../services/api';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

const ProfileSection = ({ onClose }) => {
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [about, setAbout] = useState(user?.about || 'Hey there! I am using Vchat.');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');

  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef(null);

  /* ── helpers ─────────────────────────────────────────── */
  const getInitials = (n) =>
    (n || '?')
      .trim()
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const imageUrl = useCallback((path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API_BASE}${path}`;
  }, []);

  /* ── handlers ────────────────────────────────────────── */
  const handleImageClick = () => fileInputRef.current?.click();

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Instant local preview
    const reader = new FileReader();
    reader.onloadend = () => setProfileImage(reader.result);
    reader.readAsDataURL(file);

    // Upload to server
    setUploadingImage(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const res = await fileAPI.uploadProfilePicture(formData);
      setProfileImage(res.data.filePath);
    } catch (err) {
      setError('Image upload failed. Please try again.');
      console.error('Profile picture upload error:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await userAPI.updateProfile({ name: name.trim(), about, profileImage });
      updateUser(res.data.user);
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  /* ── render ──────────────────────────────────────────── */
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          animation: 'fadeInBg 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '420px',
          background: '#fff',
          boxShadow: '8px 0 40px rgba(0,0,0,0.18)',
          zIndex: 101,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInLeft 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'auto',
        }}
        className="dark:bg-gray-900"
      >
        {/* ── Top header ── */}
        <div
          style={{
            background: 'linear-gradient(135deg, #075e54 0%, #128c7e 60%, #25d366 100%)',
            padding: '20px 20px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {/* Back button */}
          <div style={{ width: '100%', marginBottom: 6 }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.85)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 15,
                fontWeight: 500,
                padding: 0,
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Profile
            </button>
          </div>

          {/* Avatar */}
          <div
            onClick={handleImageClick}
            style={{
              position: 'relative',
              cursor: 'pointer',
              borderRadius: '50%',
              width: 128,
              height: 128,
            }}
          >
            {profileImage ? (
              <img
                src={profileImage.startsWith('data:') ? profileImage : imageUrl(profileImage)}
                alt="Profile"
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid rgba(255,255,255,0.45)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 128,
                  height: 128,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #064e45, #1db954)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 46,
                  fontWeight: 700,
                  color: '#fff',
                  border: '4px solid rgba(255,255,255,0.35)',
                }}
              >
                {getInitials(name)}
              </div>
            )}

            {/* Camera overlay on hover */}
            <div
              className="avatar-overlay"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.48)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.2s',
                color: '#fff',
                fontSize: 11,
                gap: 4,
              }}
            >
              {uploadingImage ? (
                <div
                  style={{
                    width: 26,
                    height: 26,
                    border: '2.5px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Change Photo</span>
                </>
              )}
            </div>
          </div>

          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
            {uploadingImage ? 'Uploading…' : 'Tap photo to change'}
          </p>
        </div>

        {/* ── Fields ── */}
        <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 22, flex: 1 }}>
          {/* Name */}
          <Field label="Your Name" icon="✏️">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="Enter your name"
              style={inputStyle}
              className="dark:bg-gray-800 dark:text-white dark:border-gray-600"
            />
            <Counter current={name.length} max={40} />
          </Field>

          {/* About */}
          <Field label="About / Bio" icon="📝">
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              maxLength={139}
              rows={3}
              placeholder="Tell others about yourself…"
              style={{ ...inputStyle, resize: 'none', lineHeight: 1.6 }}
              className="dark:bg-gray-800 dark:text-white dark:border-gray-600"
            />
            <Counter current={about.length} max={139} />
          </Field>

          {/* Email / mobile (read-only) */}
          <Field label="Email / Mobile" icon="📧">
            <input
              type="text"
              value={user?.email || user?.mobile || ''}
              readOnly
              style={{ ...inputStyle, background: '#f5f5f5', color: '#999', cursor: 'not-allowed' }}
              className="dark:bg-gray-800 dark:text-gray-400"
            />
          </Field>
        </div>

        {/* ── Footer: error + save ── */}
        <div style={{ padding: '0 24px 32px' }}>
          {error && (
            <p
              style={{
                color: '#ef4444',
                fontSize: 13,
                marginBottom: 12,
                padding: '10px 14px',
                background: '#fef2f2',
                borderRadius: 8,
              }}
            >
              ⚠ {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || uploadingImage}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              border: 'none',
              background: saved
                ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                : 'linear-gradient(135deg, #075e54, #128c7e)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: saving || uploadingImage ? 'not-allowed' : 'pointer',
              opacity: saving || uploadingImage ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(7,94,84,0.3)',
            }}
          >
            {saving ? (
              <div
                style={{
                  width: 20,
                  height: 20,
                  border: '2.5px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            ) : saved ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleImageChange}
        style={{ display: 'none' }}
      />

      {/* Keyframe animations */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes fadeInBg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        div:hover > .avatar-overlay { opacity: 1 !important; }
      `}</style>
    </>
  );
};

/* ── Sub-components ─────────────────────────────────── */
const Field = ({ label, icon, children }) => (
  <div>
    <label
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 700,
        color: '#075e54',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.7,
      }}
    >
      {icon} {label}
    </label>
    {children}
  </div>
);

const Counter = ({ current, max }) => (
  <p style={{ textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
    {current}/{max}
  </p>
);

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  border: '1.5px solid #e2e8f0',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit',
  background: '#fff',
};

export default ProfileSection;
