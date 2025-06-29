import React, { useState } from 'react';
import { useAuth } from '../../services/authProvider';
import { createSession } from '../../services/apiClient';
import VNCModal from '../../components/VNCViewer/VNCModal';
import Button from '../../components/Button/Button';
import styles from './Home.module.scss';

const Home = () => {
  const { userInfo } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [novncUrl, setNovncUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleNewSession = async () => {
    setLoading(true);
    setError('');
    try {
      const userId = userInfo.id;
      const targetDomain = 'www.amazon.com'; // Only the domain part is used for cookie extraction
      const res = await createSession({ userId, targetDomain });
      setNovncUrl(`http://localhost:${res.novncPort}/vnc.html?autoconnect=true&url=https://www.amazon.com/fmc/pastpurchases/whole-foods-market`);
      setModalOpen(true);
    } catch (e) {
      setError(e.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <div className={styles.title}>Hello, {userInfo?.username || 'User'}</div>
      </div>
      <div className={styles.text}>Sign in to your Amazon account securely!</div>
      <Button 
        text={loading ? 'Starting Session...' : 'New Session'}
        onClick={handleNewSession}
        disabled={loading}
        loading={loading}
        buttonType="primary"
        style={{ width: '240px' }}
      />
      {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
      <VNCModal open={modalOpen} onClose={() => setModalOpen(false)} novncUrl={novncUrl} />
    </div>
  );
};

export default Home;