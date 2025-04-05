import React, { useState, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
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
} from '@mui/icons-material';
import axios from 'axios';
import Home from './pages/Home';
import Project from './pages/Project';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<'light' | 'dark'>(prefersDarkMode ? 'dark' : 'light');
  
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

  const refreshAndNavigate = async () => {
    try {
      console.log('正在刷新项目列表...');
      navigate('/?refresh=' + new Date().getTime(), { replace: true });
    } catch (error) {
      console.error('刷新项目列表失败:', error);
      navigate('/?refresh=' + new Date().getTime(), { replace: true });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        minHeight: '100vh',
        position: 'relative'
      }}>
        <AppBar 
          position="fixed" 
          elevation={1} 
          color="inherit"
          sx={{
            zIndex: (theme) => theme.zIndex.drawer + 1
          }}
        >
          <Toolbar>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                cursor: 'pointer',
                '&:hover': {
                  opacity: 0.8
                }
              }}
              onClick={refreshAndNavigate}
            >
              <IconButton
                color="inherit"
                sx={{ mr: 1 }}
              >
                <HomeIcon />
              </IconButton>
              <Typography 
                variant="h6" 
                component="div"
              >
                Easy Dataset
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <IconButton color="inherit" onClick={toggleTheme}>
              {theme.palette.mode === 'dark' ? <LightIcon /> : <DarkIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1,
            pt: '64px', // AppBar 的高度
            minHeight: '100vh',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <Container 
            maxWidth="lg" 
            sx={{ 
              py: 4,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/projects/:projectId/*" element={<Project />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
} 