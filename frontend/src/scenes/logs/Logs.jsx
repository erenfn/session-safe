import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  InputAdornment,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import styles from './Logs.module.scss';
import CustomTable from '../../components/Table/Table';
import PaginationTable from '../../components/Pagination/TablePagination/PaginationTable';
import LogsMonitor from '../../services/logsMonitor';
import LoadingPage from '../../components/LoadingPage/LoadingPage';
import CustomTextField from '../../components/TextFieldComponents/CustomTextField/CustomTextField';
import { parseLogLine, getLevelColor } from '../../utils/logHelper';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [lastNLines, setLastNLines] = useState(50);
  const logsMonitorRef = useRef(null);

  useEffect(() => {
    // Initialize logs monitor
    const monitor = new LogsMonitor();
    logsMonitorRef.current = monitor;

    // Set up event handlers
    monitor.setOnLogs((logLine) => {
      setLogs((prevLogs) => {
        const parsed = parseLogLine(logLine, prevLogs.length);
        if (parsed) {
          return [...prevLogs, parsed];
        }
        return prevLogs;
      });
      setLoading(false);
    });

    monitor.setOnError((error) => {
      setError(error.message);
      setLoading(false);
    });

    monitor.setOnOpen(() => {
      setIsConnected(true);
      setError(null);
    });

    monitor.setOnClose(() => {
      setIsConnected(false);
    });

    monitor.start(lastNLines);

    return () => {
      monitor.stop();
    };
  }, []);

  const filteredLogs = [...logs].reverse().filter(log =>
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.timestamp.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedLogs = rowsPerPage === -1 
    ? filteredLogs 
    : filteredLogs.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      );

  // Transform logs for the custom table component
  const tableData = paginatedLogs.map(log => ({
    timestamp: new Date(log.timestamp).toLocaleString(),
    level: <Chip label={log.level} color={getLevelColor(log.level)} size="small" />,
    source: <Chip label={log.source} variant="outlined" size="small" />,
    message: <span style={{ whiteSpace: 'pre-line' }}>{log.message}</span>,
  }));

  const handleExportLogs = () => {
    // Export logs as a .txt file
    const blob = new Blob([
      filteredLogs.map(l => `[${l.timestamp}] [${l.level}] [${l.source}] ${l.message}`).join('\n')
    ], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = () => {
    if (logsMonitorRef.current) {
      logsMonitorRef.current.stop();
      setLogs([]);
      setLoading(true);
      setError(null);
      setIsConnected(false);
      logsMonitorRef.current.start(lastNLines);
    }
  };

  return (
    <Box className={styles.container}>
      {loading && (
        <Box className={styles.loadingOverlay}>
          <LoadingPage />
        </Box>
      )}
      <Box className={styles.header}>
        <span />
        <h1>
          System Logs
          {isConnected && (
            <Chip
              label="Connected"
              color="success"
              size="small"
              style={{ marginLeft: '10px' }}
            />
          )}
        </h1>
        <Box className={styles.headerActions}>
          <Tooltip title="Initial number of logs fetched. Click refresh after changing this value.">
            <span>
              <CustomTextField
                label="Lines to load"
                type="number"
                value={lastNLines}
                onChange={(e) => setLastNLines(parseInt(e.target.value) || 50)}
                sx={{mr: 2 }}
                TextFieldWidth={'80px'}
                size="small"
              />
            </span>
          </Tooltip>
          <Tooltip title="Refresh logs">
            <span>
              <IconButton onClick={handleRefresh} disabled={loading} color="primary">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Export logs">
            <span>
              <IconButton onClick={handleExportLogs} disabled={loading || !filteredLogs.length} color="primary">
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <Paper className={styles.searchContainer}>
        <CustomTextField
          fullWidth
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          startAdornment={
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          }
        />
      </Paper>

      <Box>
        {error && <Alert severity="error">{error}</Alert>}
        {filteredLogs.length === 0 && !loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={4}>
            <Typography>No logs found</Typography>
          </Box>
        ) : (
          <>
            <CustomTable
              headers={['Timestamp', 'Level', 'Source', 'Message']}
              data={tableData.map(row => [
                row.timestamp,
                row.level,
                row.source,
                row.message
              ])}
            />
            <PaginationTable
              page={page}
              setPage={setPage}
              rowsPerPage={rowsPerPage}
              setRowsPerPage={setRowsPerPage}
              count={filteredLogs.length}
              colSpan={4}
              component="div"
            />
          </>
        )}
      </Box>
    </Box>
  );
};

export default Logs; 