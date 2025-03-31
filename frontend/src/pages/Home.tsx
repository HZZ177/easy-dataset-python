import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  CardHeader,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Description as DescriptionIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  text_count: number;
}

export default function Home() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      console.log('开始获取项目列表...');
      const response = await axios.get('/api/projects');
      console.log('API响应:', response);
      if (Array.isArray(response.data)) {
        // 获取每个项目的文本数量
        const projectsWithCount = await Promise.all(
          response.data.map(async (project: Project) => {
            try {
              const countResponse = await axios.get(`/api/texts/project/${project.id}/count`);
              return {
                ...project,
                text_count: countResponse.data.count || 0
              };
            } catch (error) {
              console.warn(`获取项目 ${project.id} 的文本数量失败:`, error);
              return {
                ...project,
                text_count: 0
              };
            }
          })
        );
        console.log('项目列表:', projectsWithCount);
        setProjects(projectsWithCount);
      } else {
        console.error('API返回的数据格式不正确:', response.data);
        setError('获取项目列表失败：数据格式不正确');
        setProjects([]);
      }
    } catch (error: any) {
      console.error('获取项目列表失败:', error);
      console.error('错误详情:', error.response?.data || error.message);
      setError('获取项目列表失败');
      setProjects([]);
    }
  };

  const handleCreateProject = async () => {
    try {
      const response = await axios.post('/api/projects', newProject);
      setProjects([...projects, { ...response.data, text_count: 0 }]);
      setOpenCreate(false);
      setNewProject({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating project:', error);
      setError('创建项目失败');
    }
  };

  const handleDeleteProject = async (project: Project) => {
    try {
      await axios.post(`/api/projects/${project.id}/delete`);
      setProjects(projects.filter(p => p.id !== project.id));
      setAnchorEl(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      setError('删除项目失败');
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    setAnchorEl(event.currentTarget);
    setSelectedProject(project);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProject(null);
  };

  const getProjectColor = (projectId: string) => {
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4'];
    const hash = projectId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4">我的项目</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreate(true)}
        >
          创建项目
        </Button>
      </Box>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      <Grid container spacing={3}>
        {projects.map((project) => (
          <Grid item xs={12} sm={6} md={4} key={project.id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => theme.shadows[8],
                },
              }}
              onClick={() => navigate(`/projects/${project.id}/texts`)}
            >
              <CardHeader
                avatar={
                  <Avatar sx={{ bgcolor: getProjectColor(project.id) }}>
                    {project.name.charAt(0).toUpperCase()}
                  </Avatar>
                }
                action={
                  <IconButton 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuClick(e, project);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                }
                title={project.name}
                subheader={new Date(project.created_at).toLocaleDateString()}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  {project.description}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    size="small"
                    icon={<DescriptionIcon />}
                    label={`${project.text_count} 个文件`}
                    variant="outlined"
                  />
                </Box>
              </CardContent>
              <Box 
                sx={{ 
                  p: 2, 
                  bgcolor: (theme) => theme.palette.mode === 'light' 
                    ? theme.palette.grey[50] 
                    : theme.palette.grey[900],
                  borderTop: '1px solid',
                  borderColor: (theme) => theme.palette.mode === 'light'
                    ? theme.palette.grey[200]
                    : theme.palette.grey[800],
                }}
              >
                <Typography 
                  variant="body2" 
                  color="primary"
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                  }}
                >
                  查看详情
                  <NavigateNextIcon fontSize="small" />
                </Typography>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
        <DialogTitle>创建新项目</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="项目名称"
            fullWidth
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="项目描述"
            fullWidth
            multiline
            rows={4}
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>取消</Button>
          <Button onClick={handleCreateProject} variant="contained">
            创建
          </Button>
        </DialogActions>
      </Dialog>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/projects/${selectedProject?.id}/settings`);
          handleMenuClose();
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          编辑
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedProject) handleDeleteProject(selectedProject);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          删除
        </MenuItem>
      </Menu>
    </Box>
  );
} 
