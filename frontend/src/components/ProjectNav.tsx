import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  Typography,
  AppBar,
  Toolbar,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  Description as TextIcon,
  QuestionAnswer as QuestionIcon,
  Dataset as DatasetIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface Project {
  id: string;
  name: string;
  description: string;
}

interface ProjectNavProps {
  currentProjectId: string;
  refreshTrigger?: number;
}

export default function ProjectNav({ currentProjectId, refreshTrigger }: ProjectNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentTab = location.pathname.split('/').pop() || 'texts';

  const handleProjectChange = (event: any) => {
    const projectId = event.target.value;
    navigate(`/projects/${projectId}/${currentTab}`);
  };

  return (
    <AppBar 
      position="sticky" 
      color="inherit" 
      elevation={0}
      sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <Select
            value={loading ? "" : currentProjectId}
            onChange={handleProjectChange}
            displayEmpty
            disabled={loading}
            sx={{
              '& .MuiSelect-select': {
                cursor: 'pointer',
              },
            }}
          >
            <MenuItem value="" disabled>
              {loading ? "加载中..." : "选择项目"}
            </MenuItem>
            {projects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant={currentTab === 'texts' ? 'contained' : 'outlined'}
            startIcon={<TextIcon />}
            onClick={() => navigate(`/projects/${currentProjectId}/texts`)}
          >
            文件列表
          </Button>
          <Button
            variant={currentTab === 'datasets' ? 'contained' : 'outlined'}
            startIcon={<DatasetIcon />}
            onClick={() => navigate(`/projects/${currentProjectId}/datasets`)}
          >
            数据集管理
          </Button>
          <Button
            variant={currentTab === 'questions' ? 'contained' : 'outlined'}
            startIcon={<QuestionIcon />}
            onClick={() => navigate(`/projects/${currentProjectId}/questions`)}
          >
            问题管理
          </Button>
          <Button
            variant={currentTab === 'settings' ? 'contained' : 'outlined'}
            startIcon={<SettingsIcon />}
            onClick={() => navigate(`/projects/${currentProjectId}/settings`)}
          >
            项目设置
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
} 