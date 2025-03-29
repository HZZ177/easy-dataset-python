import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Paper,
  Alert,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Description as TextIcon,
  QuestionAnswer as QuestionIcon,
  Dataset as DatasetIcon,
} from '@mui/icons-material';
import axios from 'axios';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ProjectNav from '../components/ProjectNav';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

interface Text {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Question {
  id: string;
  content: string;
  answer: string;
  created_at: string;
  updated_at: string;
  metadata: {
    difficulty: string;
    type: string;
  };
}

interface Dataset {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  items: Array<{
    question: string;
    answer: string;
    metadata: any;
  }>;
}

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [texts, setTexts] = useState<Text[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDataset, setOpenDataset] = useState(false);
  const [newDataset, setNewDataset] = useState({ name: '', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  useEffect(() => {
    if (project) {
      setEditingProject(project);
    }
  }, [project]);

  const fetchProjectData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [projectRes, textsRes, questionsRes, datasetsRes] = await Promise.all([
        axios.get(`/api/projects/${projectId}`),
        axios.get(`/api/texts/project/${projectId}`),
        axios.get(`/api/questions/project/${projectId}`),
        axios.get(`/api/datasets/project/${projectId}`),
      ]);
      setProject(projectRes.data);
      setTexts(textsRes.data);
      setQuestions(questionsRes.data);
      setDatasets(datasetsRes.data);
    } catch (error) {
      console.error('Error fetching project data:', error);
      setError('加载项目数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    try {
      setError(null);
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      const response = await axios.post(
        `/api/projects/${projectId}/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      setTexts([...texts, response.data.text]);
      setQuestions([...questions, ...response.data.questions]);
      setOpenUpload(false);
      setSelectedFile(null);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError(error.response?.data?.detail || '上传文件失败');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateDataset = async () => {
    try {
      const response = await axios.post(`/api/datasets`, {
        ...newDataset,
        project_id: projectId,
        question_ids: questions.map((q) => q.id),
      });
      setDatasets([...datasets, response.data]);
      setOpenDataset(false);
      setNewDataset({ name: '', description: '' });
    } catch (error) {
      console.error('Error creating dataset:', error);
    }
  };

  const handleExportDataset = async (dataset: Dataset) => {
    try {
      const response = await axios.get(`/api/datasets/${dataset.id}/export`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${dataset.name}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting dataset:', error);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;
    
    try {
      setSaving(true);
      const response = await axios.put(`/api/projects/${projectId}`, {
        name: editingProject.name,
        description: editingProject.description,
      });
      setProject(response.data);
      setError(null);
      setRefreshTrigger(prev => prev + 1);
    } catch (error: any) {
      console.error('Error updating project:', error);
      setError(error.response?.data?.detail || '保存项目信息失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    try {
      await axios.delete(`/api/projects/${projectId}`);
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      setError(error.response?.data?.detail || '删除项目失败');
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchProjectData} />;
  }

  if (!project || !projectId) {
    return <ErrorState message="项目不存在" />;
  }

  return (
    <Box>
      <ProjectNav currentProjectId={projectId} refreshTrigger={refreshTrigger} />
      
      <Box sx={{ p: 3 }}>
        <Routes>
          <Route
            path="texts"
            element={
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5">文本列表</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenUpload(true)}
                  >
                    上传文本
                  </Button>
                </Box>
                {texts.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      暂无文本，请点击上方按钮上传文本文件
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {texts.map((text) => (
                      <Grid item xs={12} key={text.id}>
                        <Card>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                              <Typography variant="h6">{text.title}</Typography>
                              <Box>
                                <IconButton size="small">
                                  <EditIcon />
                                </IconButton>
                                <IconButton size="small" color="error">
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </Box>
                            <Typography color="text.secondary" sx={{ mb: 2 }}>
                              上传时间：{new Date(text.created_at).toLocaleString()}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                maxHeight: '100px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                              }}
                            >
                              {text.content}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            }
          />

          <Route
            path="questions"
            element={
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5">问题列表</Typography>
                  <Box>
                    <Button variant="outlined" sx={{ mr: 1 }}>
                      批量编辑
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />}>
                      创建问题
                    </Button>
                  </Box>
                </Box>
                {questions.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      暂无问题，请先上传文本并生成问题
                    </Typography>
                  </Paper>
                ) : (
                  <List>
                    {questions.map((question) => (
                      <Paper sx={{ mb: 2 }} key={question.id}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="h6">{question.content}</Typography>
                                <Chip
                                  label={question.metadata.difficulty}
                                  size="small"
                                  color="primary"
                                />
                                <Chip
                                  label={question.metadata.type}
                                  size="small"
                                  color="secondary"
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2">
                                  答案：{question.answer}
                                </Typography>
                              </Box>
                            }
                          />
                          <ListItemSecondaryAction>
                            <IconButton>
                              <EditIcon />
                            </IconButton>
                            <IconButton color="error">
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      </Paper>
                    ))}
                  </List>
                )}
              </Box>
            }
          />

          <Route
            path="datasets"
            element={
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h5">数据集列表</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDataset(true)}
                  >
                    创建数据集
                  </Button>
                </Box>
                {datasets.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      暂无数据集，请点击上方按钮创建数据集
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={3}>
                    {datasets.map((dataset) => (
                      <Grid item xs={12} sm={6} md={4} key={dataset.id}>
                        <Card>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="h6">{dataset.name}</Typography>
                              <Box>
                                <IconButton size="small" onClick={() => handleExportDataset(dataset)}>
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
                      </Grid>
                    ))}
                  </Grid>
                )}
              </Box>
            }
          />

          <Route
            path="settings"
            element={
              <Box>
                <Typography variant="h5" gutterBottom>项目设置</Typography>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>基本信息</Typography>
                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}
                  <TextField
                    fullWidth
                    label="项目名称"
                    value={editingProject?.name || ''}
                    onChange={(e) => setEditingProject(prev => prev ? { ...prev, name: e.target.value } : null)}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="项目描述"
                    multiline
                    rows={4}
                    value={editingProject?.description || ''}
                    onChange={(e) => setEditingProject(prev => prev ? { ...prev, description: e.target.value } : null)}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleUpdateProject}
                      disabled={saving || !editingProject || (editingProject.name === project?.name && editingProject.description === project?.description)}
                    >
                      {saving ? '保存中...' : '保存更改'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setEditingProject(project);
                        setError(null);
                      }}
                      disabled={saving || !editingProject || (editingProject.name === project?.name && editingProject.description === project?.description)}
                    >
                      取消更改
                    </Button>
                  </Box>
                </Paper>

                <Paper sx={{ p: 3, mt: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'error.main' }}>
                    危险操作
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      if (window.confirm('确定要删除此项目吗？此操作不可恢复。')) {
                        handleDeleteProject();
                      }
                    }}
                  >
                    删除项目
                  </Button>
                </Paper>
              </Box>
            }
          />
        </Routes>
      </Box>

      <Dialog
        open={openUpload}
        onClose={() => {
          setOpenUpload(false);
          setError(null);
          setSelectedFile(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>上传文本文件</DialogTitle>
        <DialogContent>
          {uploading && <LinearProgress sx={{ mt: 1 }} />}
          <Box sx={{ mt: 2 }}>
            <input
              accept=".txt,.md,.json"
              style={{ display: 'none' }}
              id="raised-button-file"
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSelectedFile(e.target.files[0]);
                  setError(null);
                }
              }}
            />
            <label htmlFor="raised-button-file">
              <Button variant="outlined" component="span" fullWidth>
                选择文件
              </Button>
            </label>
            {selectedFile && (
              <Typography sx={{ mt: 2 }}>
                已选择: {selectedFile.name}
              </Typography>
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenUpload(false);
              setError(null);
              setSelectedFile(null);
            }}
            disabled={uploading}
          >
            取消
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!selectedFile || uploading}
          >
            {uploading ? '上传中...' : '上传'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDataset}
        onClose={() => setOpenDataset(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>创建数据集</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="数据集名称"
            fullWidth
            value={newDataset.name}
            onChange={(e) => setNewDataset({ ...newDataset, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="数据集描述"
            fullWidth
            multiline
            rows={4}
            value={newDataset.description}
            onChange={(e) => setNewDataset({ ...newDataset, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDataset(false)}>取消</Button>
          <Button onClick={handleCreateDataset} variant="contained">
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 