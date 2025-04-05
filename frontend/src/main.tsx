import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App';

// 添加全局样式
const globalStyles = {
  html: {
    overflowY: 'scroll', // 始终显示垂直滚动条
    scrollbarGutter: 'stable' // 为滚动条预留空间
  },
  body: {
    margin: 0,
    padding: 0,
    overflowX: 'hidden', // 防止水平滚动
    width: '100%',
    position: 'relative'
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