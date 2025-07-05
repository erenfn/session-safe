import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Paper,
  Box,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Divider,
  Drawer,
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import StopIcon from '@mui/icons-material/Stop';
import LogoutIcon from '@mui/icons-material/Logout';
import MoreVertIcon from '@mui/icons-material/MoreVert';

const BrowserMenu = ({ onClose, onTerminate, onDisconnect, isClosing = false, style, defaultPosition = { x: 100, y: 100 } }) => {
  const [position, setPosition] = useState(defaultPosition);
  const [dragging, setDragging] = useState(false);
  const [clickedButton, setClickedButton] = useState(null); // 'close' | 'terminate' | 'disconnect' | null
  const [isMobile, setIsMobile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const menuRef = useRef(null);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Drag handlers
  const handlePointerDown = (e) => {
    if (e.target.closest('[data-drag-handle]')) {
      setDragging(true);
      const rect = menuRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (!dragging) return;
    const handlePointerMove = (e) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handlePointerUp = () => setDragging(false);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAction = (action) => {
    setClickedButton(action);
    setIsMenuOpen(false);
    
    switch (action) {
      case 'disconnect':
        onDisconnect();
        break;
      case 'close':
        onClose();
        break;
      case 'terminate':
        onTerminate();
        break;
      default:
        break;
    }
  };

  // Reusable menu item component
  const MenuItem = ({ action, icon: Icon, text }) => (
    <ListItem disablePadding>
      <ListItemButton
        onClick={() => handleAction(action)}
        disabled={isClosing}
      >
        <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
          {isClosing && clickedButton === action ? (
            <CircularProgress 
              size={16} 
              sx={{ color: 'var(--primary)' }} 
            />
          ) : (
            <Icon fontSize="small" />
          )}
        </ListItemIcon>
        <ListItemText primary={<Typography variant="body2">{text}</Typography>} />
      </ListItemButton>
    </ListItem>
  );

  const menuContent = (
    <Paper
      ref={menuRef}
      onPointerDown={handlePointerDown}
      sx={{
        borderRadius: '8px',
        overflow: 'hidden',
        position: isMobile ? 'relative' : 'fixed',
        left: isMobile ? 'auto' : position.x,
        top: isMobile ? 'auto' : position.y,
        width: isMobile ? '100%' : 240,
        p: 0,
        zIndex: 1300,
        cursor: dragging ? 'grabbing' : 'default',
        ...style,
      }}
      elevation={isMobile ? 0 : 6}
    >
      {!isMobile && (
        <Box
          display="flex"
          alignItems="center"
          px={2}
          py={1}
          data-drag-handle
          sx={{
            cursor: 'grab',
            backgroundColor: 'var(--primary)',
            color: 'var(--header-background)',
          }}
        >
          <IconButton
            size="small"
            sx={{
              p: 0,
              mr: 1,
              cursor: 'grab',
              color: 'var(--header-background)',
              '&:hover': { backgroundColor: 'transparent' },
            }}
            disableRipple
          >
            <DragIndicatorIcon fontSize="small" sx={{ color: 'var(--header-background)' }} />
          </IconButton>
          <Typography
            variant="caption"
            fontWeight="bold"
            flexGrow={1}
            sx={{ color: 'var(--header-background)' }}
          >
            Browser Menu
          </Typography>
        </Box>
      )}
      {!isMobile && <Divider />}
      <List sx={{ p: 0 }}>
        <MenuItem 
          action="disconnect" 
          icon={LogoutIcon} 
          text="Disconnect" 
        />
        <MenuItem 
          action="close" 
          icon={CloseIcon} 
          text="Close and save cookies" 
        />
        <MenuItem 
          action="terminate" 
          icon={StopIcon} 
          text="Terminate" 
        />
      </List>
    </Paper>
  );

  // Mobile view with drawer
  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={toggleMenu}
          aria-label="browser menu"
          sx={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            zIndex: 1200,
            backgroundColor: 'var(--primary)',
            color: 'white',
            border: '1px solid var(--primary)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              backgroundColor: 'var(--primary)',
              opacity: 0.9,
            },
          }}
        >
          <MoreVertIcon sx={{ color: 'white' }} />
        </IconButton>
        <Drawer
          anchor="right"
          open={isMenuOpen}
          onClose={toggleMenu}
          sx={{
            zIndex: 1300,
            '& .MuiDrawer-paper': {
              width: 280,
              maxWidth: '85vw',
            },
          }}
        >
          {menuContent}
        </Drawer>
      </>
    );
  }

  // Desktop view
  return menuContent;
};

BrowserMenu.propTypes = {
  onClose: PropTypes.func.isRequired,
  onTerminate: PropTypes.func.isRequired,
  onDisconnect: PropTypes.func.isRequired,
  isClosing: PropTypes.bool,
  style: PropTypes.object,
  defaultPosition: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
};

export default BrowserMenu;