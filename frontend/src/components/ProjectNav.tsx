import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  Typography,
  AppBar,
  Toolbar,
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
  const [currentProject, setCurrentProject] = useState<Project | null>(null);

  useEffect(() => {
    fetchProjects();
  }, [refreshTrigger]);

  useEffect(() => {
    if (projects.length > 0) {
      const project = projects.find(p => p.id === currentProjectId);
      if (project) {
        setCurrentProject(project);
      }
    }
  }, [projects, currentProjectId]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects');
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const currentTab = location.pathname.split('/').pop() || 'texts';

  const handleProjectChange = (projectId: string) => {
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
            value={currentProjectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            displayEmpty
          >
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
            variant={currentTab === 'questions' ? 'contained' : 'outlined'}
            startIcon={<QuestionIcon />}
            onClick={() => navigate(`/projects/${currentProjectId}/questions`)}
          >
            问题管理
          </Button>
          <Button
            variant={currentTab === 'datasets' ? 'contained' : 'outlined'}
            startIcon={<DatasetIcon />}
            onClick={() => navigate(`/projects/${currentProjectId}/datasets`)}
          >
            数据集管理
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