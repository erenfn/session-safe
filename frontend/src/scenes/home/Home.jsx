import React, { useState } from 'react';
import { useAuth } from '../../services/authProvider';
import { createSession } from '../../services/apiClient';
import VNCModal from '../../components/VNCViewer/VNCModal';
import Button from '../../components/Button/Button';
import toastEmitter, { TOAST_EMITTER_KEY } from '../../utils/toastEmitter';
import styles from './Home.module.scss';

const Home = () => {
  const { userInfo } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [novncUrl, setNovncUrl] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleNewSession = async () => {
    setLoading(true);
    try {
      const userId = userInfo.id;
      const targetDomain = 'amazon.com'; // Only the domain part is used for cookie extraction
      const res = await createSession({ userId, targetDomain });
      setNovncUrl(`http://localhost:${res.novncPort}/vnc.html?autoconnect=true`);
      setSessionId(res.sessionId);
      setModalOpen(true);
    } catch (e) {
      toastEmitter.emit(TOAST_EMITTER_KEY, e.message || 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSessionId(null);
    setNovncUrl('');
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
      <VNCModal 
        open={modalOpen} 
        onClose={handleCloseModal} 
        novncUrl={novncUrl} 
        sessionId={sessionId}
      />
    </div>
  );
};

export default Home;