import React, { useState, useEffect } from 'react';
import {
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Drawer,
} from '@mui/material';
import {
  HomeOutlined as HomeIcon,
  ListAlt as SessionsIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import styles from './LeftMenu.module.css';
import Logo from '../Logo/Logo';
import { useLocation, Link as RouterLink } from 'react-router-dom';
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
  const location = useLocation();
  const { userInfo } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menu when route changes on mobile
  useEffect(() => {
    if (isMobile) {
      setIsMenuOpen(false);
    }
  }, [location.pathname, isMobile]);

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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const menuContent = (
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

  // Mobile view with drawer
  if (isMobile) {
    return (
      <>
        <IconButton
          className={styles.mobileMenuButton}
          onClick={toggleMenu}
          aria-label="menu"
        >
          <MenuIcon />
        </IconButton>
        <Drawer
          anchor="left"
          open={isMenuOpen}
          onClose={toggleMenu}
          className={styles.mobileDrawer}
          PaperProps={{
            className: styles.mobileDrawerPaper,
          }}
        >
          {menuContent}
        </Drawer>
      </>
    );
  }

  // Desktop view
  return menuContent;
}

export default LeftMenu;
