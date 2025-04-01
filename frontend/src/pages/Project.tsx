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
import DatasetCard from '../components/DatasetCard';

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
  chunks?: Array<{
    content: string;
    start_index: number;
    end_index: number;
    metadata?: Record<string, any>;
  }>;
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

interface TextFile {
  id: string;
  name: string;
  size: number;
  chunks: Array<{
    content: string;
    start_index: number;
    end_index: number;
    metadata?: Record<string, any>;
  }>;
}

interface ProjectState {
  selectedFile: TextFile | null;
  selectedChunkIndex: number | null;
  selectedChunkContent: string;
  datasets: Dataset[];
  loading: boolean;
}

const styles = {
  projectContainer: {
    display: 'flex',
    gap: '20px',
    padding: '20px',
    height: '100%'
  },
  fileList: {
    flex: '0 0 300px',
    overflowY: 'auto',
    borderRight: '1px solid #e0e0e0',
    paddingRight: '20px'
  },
  chunkList: {
    flex: '0 0 250px',
    overflowY: 'auto',
    borderRight: '1px solid #e0e0e0',
    paddingRight: '20px'
  },
  chunkItem: {
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    '&:hover': {
      backgroundColor: '#f5f5f5'
    },
    '&.selected': {
      backgroundColor: '#e3f2fd',
      borderColor: '#2196f3'
    }
  },
  chunkSize: {
    color: '#666',
    fontSize: '0.9em'
  },
  datasetContent: {
    flex: 1,
    overflowY: 'auto'
  },
  datasetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  datasetList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  }
};

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [texts, setTexts] = useState<Text[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openDataset, setOpenDataset] = useState(false);
  const [openGenerateQuestions, setOpenGenerateQuestions] = useState(false);
  const [openGenerateDataset, setOpenGenerateDataset] = useState(false);
  const [newDataset, setNewDataset] = useState({ name: '', description: '' });
  const [state, setState] = useState<ProjectState>({
    selectedFile: null,
    selectedChunkIndex: null,
    selectedChunkContent: '',
    datasets: [],
    loading: false
  });
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
  const [openViewContent, setOpenViewContent] = useState(false);

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
      setState(prev => ({
        ...prev,
        datasets: response.data
      }));
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
    
    const loadData = async () => {
      setLoading(true);
      try {
        // 如果是数据集页面，需要同时加载文本列表
        if (currentTab === 'datasets') {
          await fetchTexts();
        }
        
        switch (currentTab) {
          case 'texts':
            await fetchTexts();
            break;
          case 'questions':
            await fetchQuestions();
            break;
          case 'datasets':
            await fetchDatasets();
            break;
          case 'settings':
            setLoading(false);
            break;
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('加载数据失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, currentTab]);

  useEffect(() => {
    if (project) {
      setEditingProject(project);
    }
  }, [project]);

  const handleUpload = async () => {
    if (!projectId) return;
    
    try {
      setError(null);
      setState(prev => ({ ...prev, loading: true }));
      setUploadProgress(0);
      const controller = new AbortController();
      setUploadController(controller);
      
      const formData = new FormData();
      const fileInput = document.getElementById('raised-button-file') as HTMLInputElement;
      if (!fileInput.files || !fileInput.files[0]) {
        setError('请选择文件');
        return;
      }
      formData.append('file', fileInput.files[0]);
      
      const response = await axios.post(
        `/api/projects/upload?project_id=${projectId}`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const progress = (progressEvent.loaded / progressEvent.total!) * 100;
            setUploadProgress(progress);
          },
          signal: controller.signal
        }
      );

      // 刷新文件列表
      await fetchTexts();
      
      setOpenUpload(false);
      setFileUrl(null);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError(error.response?.data?.detail || '上传失败');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
      setUploadProgress(0);
      setUploadController(null);
    }
  };

  const handleCancelUpload = () => {
    if (uploadController) {
      uploadController.abort();
    }
    setFileUrl(null);
    setState(prev => ({ ...prev, selectedFile: null }));
    setUploadProgress(0);
    setUploadController(null);
    setOpenUpload(false);
    // 重置文件输入框
    const fileInput = document.getElementById('raised-button-file') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleFileSelect = async (text: Text) => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      // 获取文件的分块数据
      const response = await axios.get(`/api/texts/chunks?text_id=${text.id}`);
      const chunks = response.data;
      
      const textFile: TextFile = {
        id: text.id,
        name: text.title,
        size: text.content.length,
        chunks: chunks
      };
      
      setState(prev => ({
        ...prev,
        selectedFile: textFile,
        selectedChunkIndex: null,
        datasets: []
      }));
    } catch (error) {
      console.error('Error fetching chunks:', error);
      setError('获取分块数据失败');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过10MB');
        return;
      }
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setError(null);
    }
  };

  const handleChunkSelect = async (chunkIndex: number) => {
    setState(prev => ({
      ...prev,
      selectedChunkIndex: chunkIndex,
      loading: true
    }));

    try {
      const response = await axios.get(`/api/projects/datasets/chunk`, {
        params: {
          project_id: projectId,
          chunk_index: chunkIndex
        }
      });
      setState(prev => ({
        ...prev,
        datasets: response.data.datasets,
        selectedChunkContent: response.data.chunk_content,
        loading: false
      }));
    } catch (error) {
      console.error('获取分块数据集失败:', error);
      setState(prev => ({
        ...prev,
        loading: false
      }));
    }
  };

  const handleGenerateDataset = async () => {
    if (!state.selectedFile || state.selectedChunkIndex === null) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await fetch(`/api/projects/${projectId}/texts/${state.selectedFile.id}/chunk/${state.selectedChunkIndex}/generate-dataset`, {
        method: 'POST'
      });
      const newDataset = await response.json();
      
      setState(prev => ({
        ...prev,
        datasets: [...prev.datasets, newDataset],
        loading: false
      }));
    } catch (error) {
      console.error('生成数据集失败:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleCreateDataset = async () => {
    try {
      const response = await axios.post(`/api/datasets`, {
        ...newDataset,
        project_id: projectId,
        question_ids: questions.map((q) => q.id),
      });
      setState(prev => ({
        ...prev,
        datasets: [...prev.datasets, response.data]
      }));
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

  const handleGenerateQuestions = async () => {
    if (!state.selectedFile || state.selectedChunkIndex === null) return;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await axios.post(`/api/projects/${projectId}/texts/${state.selectedFile.id}/chunk/${state.selectedChunkIndex}/generate-questions`);
      // 刷新问题列表
      await fetchQuestions();
      setOpenGenerateQuestions(false);
      setSelectedTextId(null);
    } catch (error) {
      console.error('生成问题失败:', error);
      setError('生成问题失败');
    } finally {
      setState(prev => ({ ...prev, loading: false }));
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
                                  startIcon={<DatasetIcon />}
                                  onClick={() => {
                                    setSelectedTextId(text.id);
                                    setOpenGenerateDataset(true);
                                  }}
                                  sx={{ mr: 1 }}
                                >
                                  生成数据集
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
              <Box sx={styles.projectContainer}>
                <Box sx={styles.fileList}>
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
                        暂无文件，请先上传文件
                      </Typography>
                    </Paper>
                  ) : (
                    <Grid container spacing={3}>
                      {texts.map((text) => (
                        <Grid item xs={12} key={text.id}>
                          <Card
                            sx={{
                              cursor: 'pointer',
                              ...(state.selectedFile?.id === text.id ? {
                                border: '2px solid #2196f3'
                              } : {})
                            }}
                            onClick={() => handleFileSelect(text)}
                          >
                            <CardContent>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">{text.title}</Typography>
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

                {state.selectedFile && (
                  <Box sx={styles.chunkList}>
                    <Typography variant="h6" gutterBottom>分块列表</Typography>
                    {state.selectedFile.chunks.map((chunk, index) => (
                      <Box
                        key={index}
                        sx={{
                          ...styles.chunkItem,
                          ...(state.selectedChunkIndex === index ? { backgroundColor: '#e3f2fd', borderColor: '#2196f3' } : {})
                        }}
                        onClick={() => handleChunkSelect(index)}
                      >
                        <Typography>分块 {index + 1}</Typography>
                        <Typography sx={styles.chunkSize}>{chunk.content.length} 字符</Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {state.selectedChunkIndex !== null && (
                  <Box sx={styles.datasetContent}>
                    <Box sx={styles.datasetHeader}>
                      <Typography variant="h6">数据集列表</Typography>
                      <Button
                        variant="contained"
                        onClick={() => {
                          setSelectedTextId(state.selectedFile?.id || null);
                          setOpenGenerateQuestions(true);
                        }}
                        disabled={state.loading}
                      >
                        {state.loading ? '生成中...' : '生成问题'}
                      </Button>
                    </Box>
                    
                    <Paper sx={{ p: 2, mb: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>分块内容预览</Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => {
                            // 打开查看完整内容的对话框
                            setOpenViewContent(true);
                          }}
                        >
                          查看完整内容
                        </Button>
                      </Box>
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
                        {state.selectedChunkContent}
                      </Typography>
                    </Paper>
                    
                    <Box sx={styles.datasetList}>
                      {state.datasets.map(dataset => (
                        <DatasetCard
                          key={dataset.id}
                          dataset={dataset}
                        />
                      ))}
                    </Box>
                  </Box>
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
          if (!state.loading) {
            handleCancelUpload();
          }
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>上传文件</DialogTitle>
        <DialogContent>
          {state.loading && (
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
              onChange={handleFileInputChange}
            />
            <label htmlFor="raised-button-file">
              <Button variant="outlined" component="span" fullWidth>
                选择文件
              </Button>
            </label>
            {fileUrl && (
              <Typography sx={{ mt: 2 }}>
                已选择: {(document.getElementById('raised-button-file') as HTMLInputElement)?.files?.[0]?.name}
                <br />
                大小: {((document.getElementById('raised-button-file') as HTMLInputElement)?.files?.[0]?.size || 0 / 1024).toFixed(2)} KB
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
            disabled={state.loading}
          >
            取消
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={!fileUrl || state.loading}
          >
            {state.loading ? '上传中...' : '上传'}
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
          {state.loading && <LinearProgress sx={{ mt: 1 }} />}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Typography sx={{ mt: 2 }}>
            确定要为选中的分块生成问题吗？这可能需要一些时间。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenGenerateQuestions(false);
              setSelectedTextId(null);
              setError(null);
            }}
            disabled={state.loading}
          >
            取消
          </Button>
          <Button
            onClick={handleGenerateQuestions}
            variant="contained"
            disabled={state.loading}
          >
            {state.loading ? '生成中...' : '生成问题'}
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

      <Dialog
        open={openViewContent}
        onClose={() => setOpenViewContent(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>分块完整内容</DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-wrap',
              maxHeight: '60vh',
              overflow: 'auto'
            }}
          >
            {state.selectedFile?.chunks[state.selectedChunkIndex!]?.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewContent(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 