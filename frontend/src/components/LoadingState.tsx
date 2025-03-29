import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = '加载中...' }: LoadingStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '50vh',
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography color="text.secondary">{message}</Typography>
    </Box>
  );
} 