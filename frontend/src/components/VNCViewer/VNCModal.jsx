import React, { useState } from 'react';
import Button from '../Button/Button';
import { extractCookiesForSession, terminateSession } from '../../services/sessionServices';
import toastEmitter, { TOAST_EMITTER_KEY } from '../../utils/toastEmitter';
import styles from './VNCModal.module.scss';
import BrowserMenu from './BrowserMenu';

export default function VNCModal({ open, onClose, novncUrl, sessionId }) {
  const [isClosing, setIsClosing] = useState(false);

  if (!open) return null;

  const handleClose = async () => {
    if (isClosing) return;

    setIsClosing(true);
    try {
      if (sessionId) {
        await extractCookiesForSession(sessionId);
        toastEmitter.emit(TOAST_EMITTER_KEY, 'Cookies saved successfully');
      }
    } catch (e) {
      console.error('Failed to extract cookies:', e);
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Failed to save cookies');
    } finally {
      setIsClosing(false);
      onClose();
    }
  };

  const handleTerminate = async () => {
    if (isClosing) return;
    setIsClosing(true);
    try {
      if (sessionId) {
        await terminateSession(sessionId);
        toastEmitter.emit(TOAST_EMITTER_KEY, 'Session terminated successfully');
      }
    } catch (e) {
      console.error('Failed to terminate session:', e);
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Failed to terminate session');
    } finally {
      setIsClosing(false);
      onClose();
    }
  };

  const handleDisconnect = () => {
    if (isClosing) return;
    onClose();
  };

  return (
    <div className={styles.modal} onClick={handleClose}>
      <section className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <BrowserMenu onClose={handleClose} onTerminate={handleTerminate} onDisconnect={handleDisconnect} isClosing={isClosing} />
        <iframe
          src={novncUrl}
          className={styles.iframe}
          title="Remote Desktop"
          allowFullScreen
        />
      </section>
    </div>
  );
}
