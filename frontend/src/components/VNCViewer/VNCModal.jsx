import React from 'react';
import Button from '../Button/Button';

const modalStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};
const iframeStyle = {
  width: '90vw',
  height: '90vh',
  border: 'none',
  borderRadius: '8px',
  background: '#fff',
};

export default function VNCModal({ open, onClose, novncUrl }) {
  if (!open) return null;
  return (
    <div style={modalStyle} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>
        <Button 
          text="Close"
          onClick={onClose}
          buttonType="secondary"
          style={{ float: 'right', margin: 8 }}
        />
        <iframe src={novncUrl} style={iframeStyle} title="Remote Desktop" allowFullScreen />
      </div>
    </div>
  );
} 