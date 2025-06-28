import React from 'react';
import { useAuth } from '../../services/authProvider';
import DropdownMenu from '../DropdownMenu/DropdownMenu'; 
import styles from './UserProfileSidebar.module.css';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
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


  const menuItems = [
    {
      text: 'Settings',
      icon: <SettingsOutlinedIcon />,
      onClick: () => navigate('/settings'),
    },
    {
      text: 'Logout',
      icon: <LogoutOutlinedIcon />,
      onClick: handleLogoutClick,
    },
  ];

  return (
    <div className={styles['user-info']}>
      <div className={styles['user-details-container']}>
        <div className={styles['user-details']}>
          <div className={styles['user-name']}>{userInfo?.username}</div>
          <div className={styles['user-role']}>{userInfo?.role}</div>
        </div>
      </div>
      <DropdownMenu menuItems={menuItems} />
    </div>
  );
}

export default UserProfileSidebar;
