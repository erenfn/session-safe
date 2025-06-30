import { createTheme } from '@mui/material/styles';

// Light theme definition
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#7f56d9',
    },
    background: {
      default: '#FFFFFF',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'white',
          color: '#344054',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '14px',
          padding: '3px 9px',
        },
      },
    },
    MuiTabPanel: {
      styleOverrides: {
        root: {
          padding: '24px 0 0 24px',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          margin: '0px 5px !important',
          '&.Mui-selected': {
            backgroundColor: '#F9FAFB !important',
            borderRadius: '8px !important',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: '250px',
          flexShrink: 0,
          zIndex: 1200,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          boxSizing: 'border-box',
        },
        root: {
          borderRadius: '8px',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--primary)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--primary)',
          },
        },
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
  typography: {
    fontFamily: 'Inter',
    body1: {
      fontSize: '14px',
      lineHeight: '16px',
      fontWeight: 500,
      color: 'var(--main-text-color)',
    },
    body2: {
      fontSize: '13px',
      lineHeight: '16px',
      fontWeight: 400,
      color: 'var(--main-text-color)',
    },
  },
});

// Dark theme definition
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7f56d9',
    },
    background: {
      default: '#121212',
    },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#333',
          color: '#FFFFFF',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '14px',
          padding: '3px 9px',
        },
      },
    },
    MuiTabPanel: {
      styleOverrides: {
        root: {
          padding: '24px 0 0 24px',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          margin: '0px 5px !important',
          '&.Mui-selected': {
            backgroundColor: '#F9FAFB !important',
            borderRadius: '8px !important',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: '250px',
          flexShrink: 0,
          zIndex: 1200,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          boxSizing: 'border-box',
        },
        root: {
          borderRadius: '8px',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--primary)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: 'var(--primary)',
          },
        },
      },
    },
  },
  typography: {
    fontFamily: 'Inter',
  },
});
