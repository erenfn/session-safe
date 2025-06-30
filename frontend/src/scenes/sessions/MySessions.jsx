import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Cookie as CookieIcon,
} from '@mui/icons-material';
import CustomTable from '../../components/Table/Table';
import LoadingPage from '../../components/LoadingPage/LoadingPage';
import PaginationTable from '../../components/Pagination/TablePagination/PaginationTable';
import CookiesDialog from './components/CookiesDialog';
import { getCurrentUserSessions, getSessionCookies } from '../../services/sessionServices';
import toastEmitter, { TOAST_EMITTER_KEY } from '../../utils/toastEmitter';
import { getStatusColor } from './helpers/statusColors';
import styles from './Sessions.module.scss';

const MySessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [cookiesDialog, setCookiesDialog] = useState({ open: false, sessionId: null, cookies: null, loading: false });

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCurrentUserSessions();
      setSessions(response.sessions || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load sessions');
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleShowCookies = async (sessionId) => {
    try {
      setCookiesDialog({ open: true, sessionId, cookies: null, loading: true });
      const response = await getSessionCookies(sessionId);
      setCookiesDialog({ open: true, sessionId, cookies: response.decryptedCookies, loading: false });
    } catch (err) {
      console.error('Error fetching cookies:', err);
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Failed to load cookies');
      setCookiesDialog({ open: false, sessionId: null, cookies: null, loading: false });
    }
  };

  const closeCookiesDialog = () => {
    setCookiesDialog({ open: false, sessionId: null, cookies: null, loading: false });
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  const transformSessionsForTable = () => {
    return sessions.map(session => {
      return {
        id: session.id,
        targetDomain: session.targetDomain,
        status: session.status,
        createdAt: formatDate(session.createdAt),
        hasCookies: session.hasCookies,
        actions: (
          <Tooltip title={session.hasCookies ? "Show cookies" : "No cookies available"}>
            <Box component="span" className={styles.actionButton}>
              <IconButton
                size="small"
                onClick={() => session.hasCookies && handleShowCookies(session.id)}
                disabled={!session.hasCookies || loading}
                className={styles.iconButton}
              >
                <CookieIcon 
                  style={{ 
                    color: session.hasCookies ? 'var(--primary)' : 'var(--second-text-color)',
                    fontSize: '16px'
                  }}
                />
              </IconButton>
            </Box>
          </Tooltip>
        )
      };
    });
  };

  // Calculate pagination
  const tableHeaders = ['ID', 'Domain', 'Status', 'Created', 'Actions'];
  const allTableData = transformSessionsForTable();
  const startIndex = page * rowsPerPage;
  const endIndex = rowsPerPage === -1 ? allTableData.length : startIndex + rowsPerPage;
  const paginatedData = allTableData.slice(startIndex, endIndex);

  return (
    <Box className={styles.container}>
      {loading && (
        <Box className={styles.loadingOverlay}>
          <LoadingPage />
        </Box>
      )}
      
      <Box className={styles.header}>
        <span/> {/* Empty span for spacing */}
        <h1>
          My Sessions ({sessions.length})
        </h1>
        <Box className={styles.headerActions}>
          <Tooltip title="Refresh sessions">
            <IconButton 
              onClick={fetchSessions} 
              color="primary"
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box className={styles.tableContainer}>
        {sessions.length === 0 ? (
          <Typography className={styles.noSessionsMessage}>
            No sessions found
          </Typography>
        ) : (
          <>
            <CustomTable 
              headers={tableHeaders}
              data={paginatedData.map(row => [
                row.id,
                row.targetDomain,
                <span style={{ color: getStatusColor(row.status) }}>
                  {row.status}
                </span>,
                row.createdAt,
                row.actions
              ])}
            />
            <PaginationTable
              page={page}
              setPage={setPage}
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
              count={sessions.length}
              colSpan={tableHeaders.length}
              labelRowsPerPage="Sessions per page:"
            />
          </>
        )}
      </Box>

      {/* Cookies Dialog */}
      <CookiesDialog
        open={cookiesDialog.open}
        onClose={closeCookiesDialog}
        cookies={cookiesDialog.cookies}
        loading={cookiesDialog.loading}
      />
    </Box>
  );
};

export default MySessions; 