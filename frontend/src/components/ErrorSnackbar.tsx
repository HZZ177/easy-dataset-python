import React from 'react';
import { Snackbar, Alert } from '@mui/material';

interface ErrorSnackbarProps {
  open: boolean;
  message: string;
  onClose: () => void;
}

const ErrorSnackbar: React.FC<ErrorSnackbarProps> = ({ open, message, onClose }) => {
  return (
    <Snackbar
      open={open}
      autoHideDuration={3000}
      onClose={(event, reason) => {
        // 只允许通过超时自动关闭
        if (reason === 'timeout') {
          onClose();
        }
      }}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        '& .MuiSnackbar-root': {
          top: '24px',
        },
      }}
    >
      <Alert 
        severity="error" 
        sx={{ 
          width: '100%',
          minHeight: '40px',
          padding: '8px 16px',
          backgroundColor: '#FEE2E2',
          color: '#991B1B',
          '& .MuiAlert-icon': {
            color: '#DC2626',
            padding: '0',
            marginRight: '8px',
          },
          '& .MuiAlert-message': {
            fontWeight: 500,
            padding: '0',
          },
          '& .MuiAlert-standardError': {
            backgroundColor: '#FEE2E2',
            color: '#991B1B',
            border: '1px solid #FEE2E2',
            borderRadius: '8px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          },
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default ErrorSnackbar; 