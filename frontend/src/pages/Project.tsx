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
  DialogContentText,
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
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [texts, setTexts] = useState<Text[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDataset, setOpenDataset] = useState(false);
  const [openGenerateQuestions, setOpenGenerateQuestions] = useState(false);
  const [newDataset, setNewDataset] = useState({ name: '', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [uploadController, setUploadController] = useState<AbortController | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<Text | null>(null);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleteTextId, setDeleteTextId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [openDownload, setOpenDownload] = useState(false);
  const [downloadTextId, setDownloadTextId] = useState<string | null>(null);
  const [downloadTextTitle, setDownloadTextTitle] = useState<string | null>(null);

  // 获取当前 tab
  const currentTab = location.pathname.split('/').pop() || 'texts';

  // 获取项目基本信息
  const fetchProjectDetail = async () => {
    if (!projectId) return;
    try {
      const response = await axios.get(`/api/projects/detail?project_id=${projectId}`);
      setProject(response.data);
    } catch (error) {
      console.error('Error fetching project details:', error);
      setError('加载项目信息失败');
    }
  };

  // 获取文本列表
  const fetchTexts = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const response = await axios.get(`/api/texts/list?project_id=${projectId}`);
      setTexts(response.data);
    } catch (error) {
      console.error('Error fetching texts:', error);
      setError('加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取问题列表
  const fetchQuestions = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const response = await axios.get(`/api/questions/list?project_id=${projectId}`);
      setQuestions(response.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError('加载问题列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取数据集列表
  const fetchDatasets = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const response = await axios.get(`/api/datasets/list?project_id=${projectId}`);
      setDatasets(response.data);
    } catch (error) {
      console.error('Error fetching datasets:', error);
      setError('加载数据集列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始加载项目信息
  useEffect(() => {
    fetchProjectDetail();
  }, [projectId]);

  // 根据当前 tab 加载对应数据
  useEffect(() => {
    if (!projectId) return;
    
    switch (currentTab) {
      case 'texts':
        fetchTexts();
        break;
      case 'questions':
        fetchQuestions();
        break;
      case 'datasets':
        fetchDatasets();
        break;
      case 'settings':
        setLoading(false); // 设置页面不需要加载数据
        break;
    }
  }, [projectId, currentTab]);

  useEffect(() => {
    if (project) {
      setEditingProject(project);
    }
  }, [project]);

  const handleUpload = async () => {
    if (!selectedFile || !projectId) return;
    
    try {
      setError(null);
      setUploading(true);
      setUploadProgress(0);
      const controller = new AbortController();
      setUploadController(controller);
      
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await axios.post(
        `/api/projects/upload?project_id=${projectId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          signal: controller.signal,
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          },
        }
      );

      if (response.data) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await fetchTexts(); // 只重新加载文本列表
        setOpenUpload(false);
      } else {
        throw new Error('上传响应数据格式错误');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Upload cancelled');
      } else {
        console.error('Error uploading file:', error);
        setError(error.response?.data?.detail || '上传文件失败');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadController(null);
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
      setSelectedFile(null);
    }
  };

  const handleCancelUpload = () => {
    if (uploadController) {
      uploadController.abort();
    }
    setOpenUpload(false);
    setError(null);
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(0);
    setUploadController(null);
  };

  const handleGenerateQuestions = async () => {
    if (!selectedTextId) return;
    
    try {
      setError(null);
      setGeneratingQuestions(true);
      const response = await axios.post(
        `/api/projects/generate-questions?project_id=${projectId}&text_id=${selectedTextId}`
      );
      setQuestions([...questions, ...response.data.questions]);
      setOpenGenerateQuestions(false);
      setSelectedTextId(null);
    } catch (error: any) {
      console.error('Error generating questions:', error);
      setError(error.response?.data?.detail || '生成问题失败');
    } finally {
      setGeneratingQuestions(false);
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
      const response = await axios.get(`/api/datasets/export?dataset_id=${dataset.id}&format=json`, {
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
      const response = await axios.post(`/api/projects/update?project_id=${projectId}`, {
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
      await axios.post(`/api/projects/delete?project_id=${projectId}`);
      navigate('/');
    } catch (error: any) {
      console.error('Error deleting project:', error);
      setError(error.response?.data?.detail || '删除项目失败');
    }
  };

  useEffect(() => {
    return () => {
      if (uploadController) {
        uploadController.abort();
      }
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [uploadController, fileUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过10MB');
        return;
      }
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleEditClick = (text: Text) => {
    setEditingText(text);
    setEditTitle(text.title);
    setOpenEdit(true);
  };

  const handleEditSave = async () => {
    if (!editingText) return;
    try {
      await axios.post(`/api/texts/update?text_id=${editingText.id}`, {
        title: editTitle
      });
      // 刷新文本列表
      const response = await axios.get(`/api/texts/list?project_id=${projectId}`);
      setTexts(response.data);
      setOpenEdit(false);
      setEditingText(null);
    } catch (error) {
      console.error('Error updating text:', error);
      setError('更新文件失败');
    }
  };

  const handleDeleteClick = (textId: string) => {
    setDeleteTextId(textId);
    setOpenDelete(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTextId) return;
    try {
      await axios.post(`/api/texts/delete?text_id=${deleteTextId}`);
      // 刷新文本列表
      const response = await axios.get(`/api/texts/list?project_id=${projectId}`);
      setTexts(response.data);
      setOpenDelete(false);
      setDeleteTextId(null);
    } catch (error) {
      console.error('Error deleting text:', error);
      setError('删除文件失败');
    }
  };

  const handleDownloadClick = (textId: string, title: string) => {
    setDownloadTextId(textId);
    setDownloadTextTitle(title);
    setOpenDownload(true);
  };

  const handleDownloadConfirm = async () => {
    if (!downloadTextId) return;
    try {
      const response = await axios.get(`/api/projects/texts/download?text_id=${downloadTextId}`, {
        responseType: 'blob'
      });
      
      // 从响应头中获取文件名
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'download';
      if (contentDisposition) {
        const matches = /filename="(.+)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = decodeURIComponent(matches[1]);
        }
      }
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setOpenDownload(false);
      setDownloadTextId(null);
      setDownloadTextTitle(null);
    } catch (error) {
      console.error('Error downloading file:', error);
      setError('下载文件失败');
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchProjectDetail} />;
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
                  <Typography variant="h5">文件列表</Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenUpload(true)}
                  >
                    上传文件
                  </Button>
                </Box>
                {texts.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      暂无文件，请点击上方按钮上传文件
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
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<QuestionIcon />}
                                  onClick={() => {
                                    setSelectedTextId(text.id);
                                    setOpenGenerateQuestions(true);
                                  }}
                                  sx={{ mr: 1 }}
                                >
                                  生成问题
                                </Button>
                                <IconButton 
                                  size="small" 
                                  onClick={() => handleEditClick(text)}
                                  sx={{ mr: 1 }}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton 
                                  size="small"
                                  onClick={() => handleDownloadClick(text.id, text.title)}
                                  sx={{ mr: 1 }}
                                >
                                  <DownloadIcon />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="error"
                                  onClick={() => handleDeleteClick(text.id)}
                                >
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
                      暂无问题，请先上传文件并生成问题
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
          if (!uploading) {
            handleCancelUpload();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>上传文件</DialogTitle>
        <DialogContent>
          {uploading && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress variant="determinate" value={uploadProgress} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                上传进度: {uploadProgress}%
              </Typography>
            </Box>
          )}
          <Box sx={{ mt: 2 }}>
            <input
              accept=".txt,.md,.json"
              style={{ display: 'none' }}
              id="raised-button-file"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="raised-button-file">
              <Button variant="outlined" component="span" fullWidth>
                选择文件
              </Button>
            </label>
            {selectedFile && (
              <Typography sx={{ mt: 2 }}>
                已选择: {selectedFile.name}
                <br />
                大小: {(selectedFile.size / 1024).toFixed(2)} KB
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
            onClick={handleCancelUpload}
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

      <Dialog
        open={openGenerateQuestions}
        onClose={() => {
          setOpenGenerateQuestions(false);
          setSelectedTextId(null);
          setError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>生成问题</DialogTitle>
        <DialogContent>
          {generatingQuestions && <LinearProgress sx={{ mt: 1 }} />}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Typography sx={{ mt: 2 }}>
            确定要为选中的文件生成问题吗？这可能需要一些时间。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenGenerateQuestions(false);
              setSelectedTextId(null);
              setError(null);
            }}
            disabled={generatingQuestions}
          >
            取消
          </Button>
          <Button
            onClick={handleGenerateQuestions}
            variant="contained"
            disabled={generatingQuestions}
          >
            {generatingQuestions ? '生成中...' : '生成问题'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEdit} onClose={() => setOpenEdit(false)}>
        <DialogTitle>编辑文件</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="文件名称"
            fullWidth
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>取消</Button>
          <Button onClick={handleEditSave} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>删除文件</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要删除这个文件吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>取消</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            删除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDownload} onClose={() => setOpenDownload(false)}>
        <DialogTitle>下载文件</DialogTitle>
        <DialogContent>
          <DialogContentText>
            确定要下载文件 "{downloadTextTitle}" 吗？
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDownload(false)}>取消</Button>
          <Button onClick={handleDownloadConfirm} variant="contained" startIcon={<DownloadIcon />}>
            下载
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 