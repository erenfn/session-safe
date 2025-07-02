import React from 'react';
import {
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
} from '@mui/material';
import {
  HomeOutlined as HomeIcon,
  ListAlt as SessionsIcon,
} from '@mui/icons-material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import styles from './LeftMenu.module.css';
import Logo from '../Logo/Logo';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import UserProfileSidebar from '../UserProfileSidebar/UserProfileSidebar';
import { useAuth } from '../../services/authProvider';
import { renderIfAuthorized } from '../../utils/generalHelper';

const menuItems = [
  {
    text: 'Home',
    icon: <HomeIcon style={{ color: 'var(--menu-icon-color)' }} />,
    route: '/',
  },
  {
    text: 'My Sessions',
    icon: <SessionsIcon style={{ color: 'var(--menu-icon-color)' }} />,
    route: '/my-sessions',
  },
];

function LeftMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userInfo } = useAuth();

  const adminMenuItems = [
    ...menuItems,
    renderIfAuthorized(userInfo?.role, 'admin', {
      text: 'Admin Sessions',
      icon: <SessionsIcon style={{ color: 'var(--menu-icon-color)' }} />,
      route: '/sessions',
    }),
    renderIfAuthorized(userInfo?.role, 'admin', {
      text: 'Logs',
      icon: <AssessmentOutlinedIcon style={{ color: 'var(--menu-icon-color)' }} />,
      route: '/logs',
    })
  ].filter(Boolean); // Remove null values

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
                component={RouterLink}
                to={item.route}
                sx={{
                  backgroundColor:
                    location.pathname === item.route
                      ? 'var(--gray-200)'
                      : 'transparent',
                }}
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
