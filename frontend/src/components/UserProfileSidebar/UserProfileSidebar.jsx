import React from 'react';
import { useAuth } from '../../services/authProvider';
import styles from './UserProfileSidebar.module.css';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import { Tooltip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../services/loginServices';
import toastEmitter, { TOAST_EMITTER_KEY } from '../../utils/toastEmitter';

function UserProfileSidebar() {
  const { userInfo, logoutAuth } = useAuth();
  const navigate = useNavigate();

  const handleLogoutClick = async () => {
    try {
      await logout();
      logoutAuth();
      navigate('/');
    } catch (error) {
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Error logging out');
    }
  };

  return (
    <div className={styles['user-info']}>
      <Tooltip
        title="Logout"
        placement="top"
        arrow
        enterDelay={500}
        leaveDelay={0}
      >
        <button
          className={styles['logout-button']}
          onClick={handleLogoutClick}
        >
          <LogoutOutlinedIcon />
        </button>
      </Tooltip>
      <div className={styles['user-details-container']}>
        <div className={styles['user-details']}>
          <div className={styles['user-name']}>{userInfo?.username}</div>
          <div className={styles['user-role']}>{userInfo?.role}</div>
        </div>
      </div>

    </div>
  );
}

export default UserProfileSidebar;
