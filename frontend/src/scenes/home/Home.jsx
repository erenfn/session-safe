import React, { useState } from 'react';
import { useAuth } from '../../services/authProvider';
import { createSession, terminateMyActiveSession, extractCookiesForSession } from '../../services/sessionServices';
import VNCModal from '../../components/VNCViewer/VNCModal';
import Button from '../../components/Button/Button';
import CustomLink from '../../components/CustomLink/CustomLink';
import toastEmitter, { TOAST_EMITTER_KEY } from '../../utils/toastEmitter';
import { buildNoVncUrl } from '../../utils/vncUtils';
import styles from './Home.module.scss';
import PopUpMessages from '../../components/PopUpMessages/PopUpMessages';
import { Typography } from '@mui/material';

const Home = () => {
  const { userInfo } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [novncUrl, setNovncUrl] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showActiveSessionPopup, setShowActiveSessionPopup] = useState(false);
  const [existingSessionInfo, setExistingSessionInfo] = useState(null);
  const [isSavingCookies, setIsSavingCookies] = useState(false);

  const startNewSession = async () => {
    setLoading(true);
    try {
      const userId = userInfo.id;
      const targetDomain = 'amazon.com';
      const res = await createSession({ userId, targetDomain });
      const launchUrl = buildNoVncUrl(res);
      setNovncUrl(launchUrl);
      console.log('New session created:', res.novncUrl);
      setSessionId(res.sessionId);
      setModalOpen(true);
    } catch (e) {
      if (e.response?.status === 409) {
        // User has an active session - use the info from the error response
        const activeSession = e.response?.data?.activeSession;
       
        if (activeSession) {
          setExistingSessionInfo(activeSession);
          setShowActiveSessionPopup(true);
        } else {
          toastEmitter.emit(TOAST_EMITTER_KEY, 'Failed to get existing session information.');
        }
      } else {
        toastEmitter.emit(TOAST_EMITTER_KEY, e.response?.data?.error || e.message || 'Failed to create session');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNewSessionClick = async () => {
    await startNewSession();
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSessionId(null);
    setNovncUrl('');
  };

  const handleGoBackToSession = () => {
    if (existingSessionInfo && existingSessionInfo.novncUrl) {
      const launchUrl = buildNoVncUrl(existingSessionInfo);
      setNovncUrl(launchUrl);
      setSessionId(existingSessionInfo.sessionId);
      setModalOpen(true);
      setShowActiveSessionPopup(false);
      setExistingSessionInfo(null);
    } else {
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Cannot open existing session - container may be in an invalid state.');
    }
  };

  const handleTerminateAndCreate = async () => {
    setShowActiveSessionPopup(false);
    setLoading(true);
    try {
      await terminateMyActiveSession();
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Previous session terminated.');
      setExistingSessionInfo(null);
      setTimeout(async () => {
        await startNewSession();
      }, 1000);
    } catch (error) {
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Failed to terminate previous session.');
      setLoading(false);
    }
  };

  const handleCloseAndSaveCookies = async () => {
    if (!existingSessionInfo?.sessionId || isSavingCookies) return;
    setIsSavingCookies(true);
    try {
      await extractCookiesForSession(existingSessionInfo.sessionId);
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Cookies saved successfully');
    } catch (e) {
      console.error('Failed to save cookies:', e);
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Failed to save cookies');
    } finally {
      setIsSavingCookies(false);
      setShowActiveSessionPopup(false);
      setExistingSessionInfo(null);
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
        onClick={handleNewSessionClick}
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
      <PopUpMessages
        open={showActiveSessionPopup}
        header="Active Session Found"
        leftButtonText="Cancel"
        rightButtonText="Terminate & Create New"
        leftButtonClickHandler={() => {
          setShowActiveSessionPopup(false);
          setExistingSessionInfo(null);
        }}
        rightButtonClickHandler={handleTerminateAndCreate}
        leftButtonType="secondary"
        rightButtonType="error"
        showThirdButton={true}
        thirdButtonText="Close and save cookies"
        thirdButtonType="primary"
        thirdButtonClickHandler={handleCloseAndSaveCookies}
        isLoading={isSavingCookies}
        loadingButtonNumber={isSavingCookies ? 2 : null}
      >
        <Typography>
          You already have an active session. To create a new one, the existing session must be terminated.
        </Typography>
        {existingSessionInfo && existingSessionInfo.novncUrl && (
          <CustomLink
            text="Go Back to Existing Session"
            onClick={handleGoBackToSession}
            sx={{
              display: 'block',
              marginTop: '0.8rem',
              marginBottom: '0.8rem',
              textAlign: 'center',
              fontSize: '14px',
              fontWeight: 600,
            }}
          />
        )}
      </PopUpMessages>
    </div >
  );
};

export default Home;