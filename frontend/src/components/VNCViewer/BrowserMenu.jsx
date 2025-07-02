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
} from '@mui/material';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import CloseIcon from '@mui/icons-material/Close';
import StopIcon from '@mui/icons-material/Stop';
import LogoutIcon from '@mui/icons-material/Logout';

const BrowserMenu = ({ onClose, onTerminate, onDisconnect, isClosing = false, style, defaultPosition = { x: 100, y: 100 } }) => {
  const [position, setPosition] = useState(defaultPosition);
  const [dragging, setDragging] = useState(false);
  const [clickedButton, setClickedButton] = useState(null); // 'close' | 'terminate' | 'disconnect' | null
  const dragOffset = useRef({ x: 0, y: 0 });
  const menuRef = useRef(null);

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

  return (
    <Paper
      ref={menuRef}
      onPointerDown={handlePointerDown}
      sx={{
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: 240,
        p: 0,
        zIndex: 1300,
        cursor: dragging ? 'grabbing' : 'default',
        ...style,
      }}
      elevation={6}
    >
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
      <Divider />
      <List sx={{ p: 0 }}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              setClickedButton('disconnect');
              onDisconnect();
            }}
            disabled={isClosing}
          >
            <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
              {isClosing && clickedButton === 'disconnect' ? <CircularProgress size={16} /> : <LogoutIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={<Typography variant="body2">Disconnect</Typography>} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              setClickedButton('close');
              onClose();
            }}
            disabled={isClosing}
          >
            <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
              {isClosing && clickedButton === 'close' ? <CircularProgress size={16} /> : <CloseIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={<Typography variant="body2">Close and save cookies</Typography>} />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => {
              setClickedButton('terminate');
              onTerminate();
            }}
            disabled={isClosing}
          >
            <ListItemIcon sx={{ minWidth: 'auto', mr: 1 }}>
              {isClosing && clickedButton === 'terminate' ? <CircularProgress size={16} /> : <StopIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText primary={<Typography variant="body2">Terminate</Typography>} />
          </ListItemButton>
        </ListItem>
      </List>
    </Paper>
  );
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