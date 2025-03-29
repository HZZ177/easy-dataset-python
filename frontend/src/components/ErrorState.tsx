import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Error as ErrorIcon } from '@mui/icons-material';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
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
      <ErrorIcon color="error" sx={{ fontSize: 48 }} />
      <Typography color="error" variant="h6" align="center">
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry}>
          重试
        </Button>
      )}
    </Box>
  );
} 