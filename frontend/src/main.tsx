import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

// 添加全局样式
const globalStyles = {
  '*': {
    margin: 0,
    padding: 0,
    boxSizing: 'border-box'
  },
  html: {
    margin: 0,
    padding: 0,
    height: '100%',
    width: '100%',
    overflow: 'auto'
  },
  body: {
    margin: 0,
    padding: 0,
    width: '100%',
    minHeight: '100%',
    overflow: 'auto',
    scrollbarGutter: 'stable'
  },
  '#root': {
    margin: 0,
    padding: 0,
    width: '100vw',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden'
  },
  '.MuiDialog-root': {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1300,
    overflow: 'hidden'
  },
  '.MuiDialog-paper': {
    position: 'absolute',
    margin: '24px',
    maxHeight: 'calc(100% - 48px)',
    overflow: 'auto'
  },
  '.MuiDialog-container': {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  }
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: globalStyles
    },
    MuiPopover: {
      defaultProps: {
        container: document.body,
        disablePortal: false
      },
      styleOverrides: {
        root: {
          position: 'fixed',
          zIndex: 1300
        },
        paper: {
          position: 'fixed',
          overflow: 'auto',
          maxHeight: 'calc(100vh - 100px)'
        }
      }
    },
    MuiMenu: {
      defaultProps: {
        container: document.body,
        disablePortal: false
      },
      styleOverrides: {
        paper: {
          position: 'fixed',
          overflow: 'auto',
          maxHeight: 'calc(100vh - 100px)'
        }
      }
    },
    MuiSelect: {
      defaultProps: {
        MenuProps: {
          container: document.body,
          disablePortal: false
        }
      },
      styleOverrides: {
        select: {
          '&:focus': {
            backgroundColor: 'transparent' // 移除选中时的背景色变化
          }
        }
      }
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
); 