import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
} from '@mui/material';
import LoadingPage from '../../../components/LoadingPage/LoadingPage';

const CookiesDialog = ({ 
  open, 
  onClose, 
  cookies, 
  loading,
}) => {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Session Cookies
        {loading && <Typography variant="body2" color="textSecondary">Loading...</Typography>}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <LoadingPage />
          </Box>
        ) : cookies ? (
          <Paper sx={{ 
            p: 2, 
            backgroundColor: 'var(--header-background)',
            border: '1px solid var(--light-border-color)',
            borderRadius: '8px'
          }}>
            <Typography variant="body2" component="pre" sx={{ 
              whiteSpace: 'pre-wrap', 
              wordBreak: 'break-all',
              fontFamily: 'monospace',
              fontSize: '12px'
            }}>
              {(() => {
                try {
                  const parsed = JSON.parse(cookies);
                  return JSON.stringify(parsed, null, 2);
                } catch (e) {
                  return cookies;
                }
              })()}
            </Typography>
          </Paper>
        ) : (
          <Typography>No cookies available for this session.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CookiesDialog; 