import React, { useState, useMemo } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Button,
  ThemeProvider,
  createTheme,
  CssBaseline,
  useMediaQuery,
} from '@mui/material';
import {
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  Home as HomeIcon,
  Translate as TranslateIcon,
} from '@mui/icons-material';
import Home from './pages/Home';
import Project from './pages/Project';

export default function App() {
  const navigate = useNavigate();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'light' ? '#1976d2' : '#90caf9',
          },
          secondary: {
            main: mode === 'light' ? '#9c27b0' : '#ce93d8',
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#121212',
            paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
          },
        },
        typography: {
          fontFamily: [
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
          ].join(','),
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
              },
            },
          },
        },
      }),
    [mode]
  );

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const toggleLanguage = () => {
    setLanguage((prevLang) => (prevLang === 'zh' ? 'en' : 'zh'));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AppBar position="fixed" elevation={1} color="inherit">
          <Toolbar>
            <IconButton
              color="inherit"
              onClick={() => navigate('/')}
              sx={{ mr: 2 }}
            >
              <HomeIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Easy Dataset
            </Typography>
            <IconButton color="inherit" onClick={toggleLanguage}>
              <TranslateIcon />
            </IconButton>
            <IconButton color="inherit" onClick={toggleTheme}>
              {theme.palette.mode === 'dark' ? <LightIcon /> : <DarkIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, pt: 8 }}>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/projects/:projectId/*" element={<Project />} />
            </Routes>
          </Container>
        </Box>

        <Box
          component="footer"
          sx={{
            py: 3,
            px: 2,
            mt: 'auto',
            backgroundColor: theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
          }}
        >
          <Container maxWidth="lg">
            <Typography variant="body2" color="text.secondary" align="center">
              © {new Date().getFullYear()} Easy Dataset. {language === 'zh' ? '保留所有权利。' : 'All rights reserved.'}
            </Typography>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
} 