import React from 'react';
import {
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import {
  HomeOutlined as HomeIcon,
} from '@mui/icons-material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import styles from './LeftMenu.module.css';
import Logo from '../Logo/Logo';
import { useNavigate, useLocation } from 'react-router-dom';
import UserProfileSidebar from '../UserProfileSidebar/UserProfileSidebar';
import { useAuth } from '../../services/authProvider';

const menuItems = [
  {
    text: 'Home',
    icon: <HomeIcon style={{ color: 'var(--menu-icon-color)' }} />,
    route: '/',
  },
];

function LeftMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useAuth();

  const adminMenuItems = [
    ...menuItems,
    ...(userInfo?.role === 'admin' ? [{
      text: 'Settings',
      icon: <SettingsOutlinedIcon style={{ color: 'var(--menu-icon-color)' }} />,
      route: '/settings',
    }] : [])
  ];

  const handleNavigation = (route) => {
    if (route && route.startsWith('/')) {
      navigate(route);
    } else if (route) {
      window.open(route, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className={styles.leftMenu}>
      <div>
        <Logo isSidebar={true} />
        <List>
          {adminMenuItems.map((item, index) =>
            item.title ? (
              <ListItemText
                key={index}
                primary={item.text}
                className={styles.title}
              />
            ) : (
              <ListItemButton
                key={index}
                className={styles.menuItem}
                sx={{
                  backgroundColor:
                    location.pathname === item.route
                      ? 'var(--gray-200)'
                      : 'transparent',
                }}
                onClick={() => handleNavigation(item.route)}
              >
                <ListItemIcon sx={{ color: 'var(--menu-icon-color)' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            )
          )}
        </List>
      </div>
      <UserProfileSidebar />
    </div>
  );
}

export default LeftMenu;
