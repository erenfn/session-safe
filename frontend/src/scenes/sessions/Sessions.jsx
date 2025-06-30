import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { TrashIcon } from '../../assets/icons/utilityIcons';
import CustomTable from '../../components/Table/Table';
import LoadingPage from '../../components/LoadingPage/LoadingPage';
import PaginationTable from '../../components/Pagination/TablePagination/PaginationTable';
import PopUpMessages from '../../components/PopUpMessages/PopUpMessages';
import { getAllSessions, terminateSession, terminateAllSessions } from '../../services/sessionServices';
import toastEmitter, { TOAST_EMITTER_KEY } from '../../utils/toastEmitter';
import { getStatusColor } from './helpers/statusColors';
import styles from './Sessions.module.scss';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showTerminateAllPopup, setShowTerminateAllPopup] = useState(false);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllSessions();
      setSessions(response.sessions || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Failed to load sessions');
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId) => {
    try {
      await terminateSession(sessionId);
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Session terminated successfully');
      fetchSessions(); // Refresh the list
    } catch (err) {
      console.error('Error terminating session:', err);
      setError('Failed to terminate session');
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Failed to terminate session');
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      const response = await terminateAllSessions();
      const message = response.terminatedCount > 0 
        ? `Successfully terminated ${response.terminatedCount} sessions`
        : 'No active sessions to terminate';
      toastEmitter.emit(TOAST_EMITTER_KEY, message);
      fetchSessions(); // Refresh the list
    } catch (err) {
      console.error('Error terminating all sessions:', err);
      setError('Failed to terminate all sessions');
      toastEmitter.emit(TOAST_EMITTER_KEY, 'Failed to terminate all sessions');
    }
  };

  const openTerminateAllPopup = () => {
    setShowTerminateAllPopup(true);
  };

  const closeTerminateAllPopup = () => {
    setShowTerminateAllPopup(false);
  };

  const confirmTerminateAll = () => {
    handleTerminateAllSessions();
    closeTerminateAllPopup();
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
      const isTerminatable = session.status === 'active' || session.status === 'pending';
      
      return {
        id: session.id,
        username: session.username || 'Unknown User',
        targetDomain: session.targetDomain,
        status: session.status,
        createdAt: formatDate(session.createdAt),
        actions: (
          <Tooltip title={isTerminatable ? "Terminate session" : "Session cannot be terminated"}>
            <Box
              component="span"
              className={`${styles.actionButton} ${isTerminatable ? styles.terminatable : styles.notTerminatable}`}
            >
              <IconButton
                size="small"
                onClick={() => isTerminatable && handleTerminateSession(session.id)}
                disabled={!isTerminatable || loading}
                className={`${styles.iconButton} ${isTerminatable ? styles.terminatable : styles.notTerminatable}`}
              >
                <TrashIcon 
                  width="16" 
                  height="16" 
                  stroke={isTerminatable ? 'var(--border-error-solid)' : 'var(--second-text-color)'}
                />
              </IconButton>
            </Box>
          </Tooltip>
        )
      };
    });
  };

  // Calculate pagination
  const tableHeaders = ['ID', 'Username', 'Domain', 'Status', 'Created', 'Actions'];
  const allTableData = transformSessionsForTable();
  const startIndex = page * rowsPerPage;
  const endIndex = rowsPerPage === -1 ? allTableData.length : startIndex + rowsPerPage;
  const paginatedData = allTableData.slice(startIndex, endIndex);
  
  const hasTerminatableSessions = sessions.some(
    s => s.status === 'active' || s.status === 'pending'
  );

  const terminatableSessionsCount = sessions.filter(
    s => s.status === 'active' || s.status === 'pending'
  ).length;

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
          Admin Sessions ({sessions.length})
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
                row.username,
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
            <Box className={styles.terminateAllButton}>
              <Button
                variant="outlined"
                color="error"
                onClick={openTerminateAllPopup}
                disabled={loading || !hasTerminatableSessions}
                className={hasTerminatableSessions ? styles.terminateAllButtonEnabled : styles.terminateAllButtonDisabled}
              >
                Terminate All Active Sessions
              </Button>
            </Box>
          </>
        )}
      </Box>

      <PopUpMessages
        open={showTerminateAllPopup}
        header="Confirm Termination"
        leftButtonText="Cancel"
        rightButtonText="Terminate All"
        leftButtonClickHandler={closeTerminateAllPopup}
        rightButtonClickHandler={confirmTerminateAll}
        leftButtonType="secondary"
        rightButtonType="error"
      >
        <Typography style={{ fontSize: 'var(--font-regular)' }}>
          Are you sure you want to terminate all active sessions? 
          {terminatableSessionsCount > 0 && (
            <span style={{ fontWeight: 'bold' }}>
              {' '}This will terminate {terminatableSessionsCount} session{terminatableSessionsCount !== 1 ? 's' : ''}.
            </span>
          )}
          {' '}This action cannot be undone.
        </Typography>
      </PopUpMessages>
    </Box>
  );
};

export default Sessions;
