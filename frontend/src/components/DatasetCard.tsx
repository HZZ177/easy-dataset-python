import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon
} from '@mui/icons-material';

interface DatasetCardProps {
  dataset: {
    id: string;
    name: string;
    description: string;
    items: Array<{
      question: string;
      answer: string;
      metadata?: Record<string, any>;
    }>;
  };
}

const DatasetCard: React.FC<DatasetCardProps> = ({ dataset }) => {
  const handleExportDataset = () => {
    // TODO: 实现导出功能
    console.log('导出数据集:', dataset.id);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{dataset.name}</Typography>
          <Box>
            <IconButton size="small" onClick={handleExportDataset}>
              <DownloadIcon />
            </IconButton>
            <IconButton size="small">
              <EditIcon />
            </IconButton>
            <IconButton size="small" color="error">
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          {dataset.description}
        </Typography>
        <Chip
          label={`${dataset.items.length} 个问答对`}
          size="small"
        />
      </CardContent>
    </Card>
  );
};

export default DatasetCard; 