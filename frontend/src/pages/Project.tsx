import React, { useState, useEffect, useRef } from 'react';
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
  Checkbox,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Tooltip,
  Autocomplete,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Description as TextIcon,
  QuestionAnswer as QuestionIcon,
  Dataset as DatasetIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import axios from 'axios';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';
import ProjectNav from '../components/ProjectNav';
import DatasetCard from '../components/DatasetCard';
import ErrorSnackbar from '../components/ErrorSnackbar';

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
  text_id: string;
  chunk_index: number;
  metadata: {
    difficulty?: string;
    type?: string;
    thought_chain?: string;
  };
  created_at: string;
  updated_at: string;
  status: string;
  tags: string[];
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
    question_count?: number;
  }>;
}

interface ProjectState {
  selectedFile: TextFile | null;
  selectedChunkIndex: number | null;
  selectedChunkContent: string;
  datasets: Dataset[];
  loading: boolean;
  selectedChunks: number[];
  generateProgress: {
    current: number;
    total: number;
    isOpen: boolean;
    status: 'processing' | 'success' | 'error' | 'cancelling' | 'cancelled' | 'partial';
    message?: string;
    isCancelled?: boolean;
  };
}

interface QuestionResponse {
  items: Question[];
  total: number;
  page: number;
  page_size: number;
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
    flex: '0 0 350px',
    height: 'calc(100vh - 200px)',
    overflowY: 'auto',
    borderRight: '1px solid #e0e0e0',
    paddingRight: '20px',
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#f1f1f1',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#888',
      borderRadius: '4px',
      '&:hover': {
        background: '#555',
      },
    },
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
    overflowY: 'auto',
    height: 'calc(100vh - 200px)',
    '&::-webkit-scrollbar': {
      width: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#f1f1f1',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#888',
      borderRadius: '4px',
      '&:hover': {
        background: '#555',
      },
    },
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
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 20, 40, 100];
  const [openUpload, setOpenUpload] = useState(false);
  const [openDataset, setOpenDataset] = useState(false);
  const [openGenerateQuestions, setOpenGenerateQuestions] = useState(false);
  const [openGenerateDataset, setOpenGenerateDataset] = useState(false);
  const [newDataset, setNewDataset] = useState({ name: '', description: '' });
  const [isCancelled, setIsCancelled] = useState(false);
  const [state, setState] = useState<ProjectState>({
    selectedFile: null,
    selectedChunkIndex: null,
    selectedChunkContent: '',
    datasets: [],
    loading: false,
    selectedChunks: [],
    generateProgress: {
      current: 0,
      total: 0,
      isOpen: false,
      status: 'processing'
    }
  });
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedChunkIndex, setSelectedChunkIndex] = useState<number | null>(null);
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
  const [selectedTextChunks, setSelectedTextChunks] = useState<Array<{
    content: string;
    start_index: number;
    end_index: number;
    question_count?: number;
  }>>([]);
  const isCancelledRef = useRef(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [openEditQuestion, setOpenEditQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingAnswer, setEditingAnswer] = useState('');
  const [editingThoughtChain, setEditingThoughtChain] = useState('');
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [chunkQuestions, setChunkQuestions] = useState<Question[]>([]);
  const [highlightedQuestionId, setHighlightedQuestionId] = useState<string | null>(null);
  const [openGenerateAnswer, setOpenGenerateAnswer] = useState(false);
  const [generatingAnswerQuestion, setGeneratingAnswerQuestion] = useState<Question | null>(null);
  const [answerGenerateProgress, setAnswerGenerateProgress] = useState({
    isOpen: false,
    status: 'processing' as 'processing' | 'success' | 'error' | 'cancelling' | 'cancelled',
    message: '',
    current: 0,
    total: 0
  });
  const [openDeleteQuestion, setOpenDeleteQuestion] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);
  const [openBatchDeleteQuestions, setOpenBatchDeleteQuestions] = useState(false);
  const [errorSnackbar, setErrorSnackbar] = useState({
    open: false,
    message: ''
  });
  const [openViewChunkContent, setOpenViewChunkContent] = useState(false);
  const [viewingChunkContent, setViewingChunkContent] = useState<{
    textId: string;
    chunkIndex: number;
    content: string;
  } | null>(null);

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
      const response = await axios.get(`/api/texts/list`, {
        params: {
          project_id: projectId
        }
      });
      setTexts(response.data);
    } catch (error) {
      console.error('Error fetching texts:', error);
      setError('加载文本列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取问题列表
  const fetchQuestions = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const response = await axios.get(`/api/questions/list`, {
        params: {
          project_id: projectId,
          text_id: selectedTextId,
          chunk_index: selectedChunkIndex,
          page: page,
          page_size: pageSize
        }
      });
      setQuestions(response.data.items);
      setTotalQuestions(response.data.total);
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

  // 获取文本分块列表
  const fetchTextChunks = async (textId: string) => {
    try {
      const response = await axios.get(`/api/texts/chunks`, {
        params: {
          text_id: textId
        }
      });
      const chunks = response.data;
      
      // 获取每个分块的问题数量
      const chunksWithQuestionCount = await Promise.all(
        chunks.map(async (chunk: any, index: number) => {
          try {
            const questionResponse = await axios.get(`/api/projects/${projectId}/texts/${textId}/chunk/${index}/questions/count`);
            return {
              ...chunk,
              question_count: questionResponse.data.count
            };
          } catch (error) {
            console.error(`Error fetching question count for chunk ${index}:`, error);
            return {
              ...chunk,
              question_count: 0
            };
          }
        })
      );
      
      setSelectedTextChunks(chunksWithQuestionCount);
    } catch (error) {
      console.error('Error fetching chunks:', error);
      setError('获取分块数据失败');
    }
  };

  // 添加获取分块问题的函数
  const fetchChunkQuestions = async (textId: string, chunkIndex: number) => {
    try {
      const response = await axios.get(`/api/questions/list`, {
        params: {
          project_id: projectId,
          text_id: textId,
          chunk_index: chunkIndex,
          page: 1,
          page_size: 100
        }
      });
      setChunkQuestions(response.data.items);
    } catch (error) {
      console.error('获取分块问题失败:', error);
      setError('获取分块问题失败');
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
          // 如果当前有选中的文件，只刷新其所有分块的问题数量
          if (state.selectedFile) {
            const chunksWithQuestionCount = await Promise.all(
              state.selectedFile.chunks.map(async (chunk, index) => {
                try {
                  const questionResponse = await axios.get(`/api/projects/${projectId}/texts/${state.selectedFile!.id}/chunk/${index}/questions/count`);
                  return {
                    ...chunk,
                    question_count: questionResponse.data.count
                  };
                } catch (error) {
                  console.error(`Error fetching question count for chunk ${index}:`, error);
                  return {
                    ...chunk,
                    question_count: 0
                  };
                }
              })
            );
            
            setState(prev => ({
              ...prev,
              selectedFile: {
                ...prev.selectedFile!,
                chunks: chunksWithQuestionCount
              }
            }));

            // 如果当前有选中的分块，刷新该分块的问题列表
            if (state.selectedChunkIndex !== null) {
              await fetchChunkQuestions(state.selectedFile.id, state.selectedChunkIndex);
            }
          }
        }
        
        switch (currentTab) {
          case 'texts':
            await fetchTexts();
            break;
          case 'questions':
            await fetchTexts();
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
      
      // 获取每个分块的问题数量
      const chunksWithQuestionCount = await Promise.all(
        chunks.map(async (chunk: any, index: number) => {
          try {
            const questionResponse = await axios.get(`/api/projects/${projectId}/texts/${text.id}/chunk/${index}/questions/count`);
            return {
              ...chunk,
              question_count: questionResponse.data.count
            };
          } catch (error) {
            console.error(`Error fetching question count for chunk ${index}:`, error);
            return {
              ...chunk,
              question_count: 0
            };
          }
        })
      );
      
      const textFile: TextFile = {
        id: text.id,
        name: text.title,
        size: text.content.length,
        chunks: chunksWithQuestionCount
      };
      
      setState(prev => ({
        ...prev,
        selectedFile: textFile,
        selectedChunkIndex: null,
        datasets: [],
        generateProgress: {
          current: 0,
          total: 0,
          isOpen: false,
          status: 'processing'
        }
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

      // 获取分块的问题列表
      if (state.selectedFile) {
        await fetchChunkQuestions(state.selectedFile.id, chunkIndex);
      }
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

  const handleChunkCheckboxChange = (chunkIndex: number) => {
    setState(prev => {
      const newSelectedChunks = prev.selectedChunks.includes(chunkIndex)
        ? prev.selectedChunks.filter(index => index !== chunkIndex)
        : [...prev.selectedChunks, chunkIndex];
      return {
        ...prev,
        selectedChunks: newSelectedChunks
      };
    });
  };

  const handleGenerateQuestions = async () => {
    if (!state.selectedFile || state.selectedChunkIndex === null) return;
    
    try {
      setState(prev => ({
        ...prev,
        generateProgress: {
          ...prev.generateProgress,
          status: 'processing',
          current: 0,
          total: 1
        }
      }));
      setOpenGenerateQuestions(false);
      
      const response = await axios.post(
        `/api/projects/${projectId}/texts/${state.selectedFile.id}/chunk/${state.selectedChunkIndex}/generate-questions`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.error || '生成问题失败');
      }
      
      setState(prev => ({
        ...prev,
        generateProgress: {
          ...prev.generateProgress,
          status: 'success',
          current: 1,
          total: 1
        }
      }));
      await fetchQuestions();
    } catch (error) {
      handleError(error);
      setState(prev => ({
        ...prev,
        generateProgress: {
          ...prev.generateProgress,
          status: 'error',
          current: 0,
          total: 1
        }
      }));
    }
  };

  const handleBatchGenerateQuestions = async () => {
    if (!state.selectedFile || state.selectedChunks.length === 0) return;

    // 重置取消状态
    isCancelledRef.current = false;

    setState(prev => ({ 
      ...prev, 
      loading: true,
      generateProgress: {
        current: 0,
        total: prev.selectedChunks.length,
        isOpen: true,
        status: 'processing',
        isCancelled: false,
        message: '正在生成问题...'
      }
    }));
    setError(null);

    try {
      const selectedFile = state.selectedFile;
      let completedChunks = 0;
      const completedChunkIndices: number[] = [];
      const updatedQuestionCounts: { [key: number]: number } = {};
      const failedChunks: { index: number; error: string }[] = [];

      for (let i = 0; i < state.selectedChunks.length; i++) {
        const chunkIndex = state.selectedChunks[i];
        
        // 检查是否被取消
        if (isCancelledRef.current) {
          break;
        }

        try {
          const response = await axios.post(`/api/projects/${projectId}/texts/${selectedFile.id}/chunk/${chunkIndex}/generate-questions`);
          if (!response.data.success) {
            throw new Error(response.data.error);
          }
          
          completedChunks++;
          completedChunkIndices.push(chunkIndex);
          
          // 更新进度
          setState(prev => ({
            ...prev,
            generateProgress: {
              ...prev.generateProgress,
              current: completedChunks,
              message: `正在生成问题...(${completedChunks}/${state.selectedChunks.length})`
            }
          }));

          // 获取当前分块的问题数量
          const questionCountResponse = await axios.get(`/api/projects/${projectId}/texts/${selectedFile.id}/chunk/${chunkIndex}/questions/count`);
          updatedQuestionCounts[chunkIndex] = questionCountResponse.data.count;

          // 更新所有已完成分块的问题数量
          setState(prev => ({
            ...prev,
            selectedFile: {
              ...selectedFile,
              chunks: selectedFile.chunks.map((chunk, idx) => ({
                ...chunk,
                question_count: updatedQuestionCounts[idx] !== undefined 
                  ? updatedQuestionCounts[idx] 
                  : chunk.question_count
              }))
            }
          }));
        } catch (error: any) {
          console.error(`生成分块 ${chunkIndex} 的问题失败:`, error);
          failedChunks.push({
            index: chunkIndex,
            error: error.response?.data?.error || error.message || '生成问题失败'
          });
          // 即使失败也更新进度
          completedChunks++;
          setState(prev => ({
            ...prev,
            generateProgress: {
              ...prev.generateProgress,
              current: completedChunks,
              message: `正在生成问题...(${completedChunks}/${state.selectedChunks.length})`
            }
          }));
        }
      }

      // 更新最终状态
      if (failedChunks.length > 0) {
        setState(prev => ({
          ...prev,
          generateProgress: {
            ...prev.generateProgress,
            status: 'error',
            message: `部分分块生成失败：\n${failedChunks.map(f => `分块 ${f.index + 1}: ${f.error}`).join('\n')}`
          },
          selectedChunks: [] // 清空复选框
        }));
      } else if (isCancelledRef.current) {
        setState(prev => ({
          ...prev,
          generateProgress: {
            ...prev.generateProgress,
            status: 'cancelled',
            message: `已取消生成，完成了 ${completedChunks} 个分块的问题生成`
          },
          selectedChunks: [] // 清空复选框
        }));
      } else {
        setState(prev => ({
          ...prev,
          generateProgress: {
            ...prev.generateProgress,
            status: 'success',
            message: `所有分块的问题生成完成，共生成 ${completedChunks} 个分块的问题`
          },
          selectedChunks: [] // 清空复选框
        }));
      }
    } catch (error: any) {
      console.error('批量生成问题失败:', error);
      setState(prev => ({ 
        ...prev, 
        generateProgress: {
          ...prev.generateProgress,
          status: 'error',
          message: error.response?.data?.error || error.message || '批量生成问题失败'
        },
        selectedChunks: [] // 清空复选框
      }));
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // 添加关闭进度弹窗的方法
  const handleCloseProgressDialog = () => {
    setState(prev => ({
      ...prev,
      generateProgress: {
        current: 0,
        total: 0,
        isOpen: false,
        status: 'processing'
      }
    }));
  };

  // 添加全选处理方法
  const handleSelectAll = () => {
    if (!state.selectedFile) return;
    
    setState(prev => {
      if (!prev.selectedFile) return prev;
      
      if (prev.selectedChunks.length === prev.selectedFile.chunks.length) {
        // 如果全部选中，则取消全选
        return {
          ...prev,
          selectedChunks: []
        };
      } else {
        // 否则全选
        return {
          ...prev,
          selectedChunks: prev.selectedFile.chunks.map((_, i) => i)
        };
      }
    });
  };

  // 添加判断是否全选的方法
  const isAllSelected = () => {
    if (!state.selectedFile) return false;
    return state.selectedChunks.length === state.selectedFile.chunks.length;
  };

  // 添加判断是否部分选中的方法
  const isIndeterminate = () => {
    if (!state.selectedFile) return false;
    return state.selectedChunks.length > 0 && state.selectedChunks.length < state.selectedFile.chunks.length;
  };

  // 当选择文件时获取分块列表
  useEffect(() => {
    if (selectedTextId) {
      fetchTextChunks(selectedTextId);
    } else {
      setSelectedTextChunks([]);
    }
  }, [selectedTextId]);

  const handleSelectAllQuestions = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedQuestions(questions.map(q => q.id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleSelectQuestion = (questionId: string) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  const handleViewThoughtChain = (question: any) => {
    // TODO: 实现查看思维链的功能
    console.log('查看思维链:', question);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setEditingAnswer(question.answer || '');
    setEditingThoughtChain(question.metadata?.thought_chain || '');
    setOpenEditQuestion(true);
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    
    try {
      setSavingQuestion(true);
      await axios.put(`/api/questions/update?question_id=${editingQuestion.id}`, {
        answer: editingAnswer,
        metadata: {
          ...editingQuestion.metadata,
          thought_chain: editingThoughtChain
        }
      });
      
      // 刷新问题列表
      await fetchQuestions();
      setOpenEditQuestion(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error('Error updating question:', error);
      setError('更新问题失败');
    } finally {
      setSavingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (question: Question) => {
    setDeletingQuestion(question);
    setOpenDeleteQuestion(true);
  };

  const handleConfirmDeleteQuestion = async () => {
    if (!deletingQuestion) return;
    
    try {
      await axios.delete(`/api/questions/delete?question_id=${deletingQuestion.id}`);
      // 刷新问题列表
      fetchQuestions();
      setOpenDeleteQuestion(false);
      setDeletingQuestion(null);
    } catch (error) {
      console.error('删除问题失败:', error);
      setError('删除问题失败');
    }
  };

  // 添加处理问题卡片点击的函数
  const handleQuestionCardClick = (question: Question) => {
    navigate(`/projects/${projectId}/questions`);
    setSelectedTextId(question.text_id);
    setSelectedChunkIndex(question.chunk_index);
    setHighlightedQuestionId(question.id);
    setPage(1);
  };

  // 当筛选条件或页码改变时重新获取问题列表
  useEffect(() => {
    if (currentTab === 'questions') {
      fetchQuestions();
    }
  }, [selectedTextId, selectedChunkIndex, page, pageSize]);

  // 修改生成答案的处理函数
  const handleGenerateAnswer = async (question: Question) => {
    setGeneratingAnswerQuestion(question);
    setOpenGenerateAnswer(true);
  };

  const handleConfirmGenerateAnswer = async () => {
    if (!generatingAnswerQuestion) return;

    try {
      setOpenGenerateAnswer(false);
      setAnswerGenerateProgress({
        isOpen: true,
        status: 'processing',
        message: '正在生成答案...',
        current: 0,
        total: 1
      });

      const response = await axios.post(`/api/questions/${generatingAnswerQuestion.id}/generate-answer`);
      
      if (!response.data.success) {
        throw new Error(response.data.error);
      }
      
      // 刷新问题列表
      await fetchQuestions();
      
      setAnswerGenerateProgress({
        isOpen: true,
        status: 'success',
        message: '答案生成成功',
        current: 1,
        total: 1
      });
    } catch (error: any) {
      console.error('生成答案失败:', error);
      setAnswerGenerateProgress({
        isOpen: true,
        status: 'error',
        message: error.response?.data?.error || error.message || '生成答案失败',
        current: 0,
        total: 1
      });
    }
  };

  // 添加批量生成答案的处理函数
  const handleBatchGenerateAnswers = async () => {
    if (selectedQuestions.length === 0) return;

    // 重置取消状态
    isCancelledRef.current = false;

    setAnswerGenerateProgress({
      isOpen: true,
      status: 'processing',
      message: `正在生成答案... (0/${selectedQuestions.length})`,
      current: 0,
      total: selectedQuestions.length
    });

    let completedCount = 0;
    const failedQuestions: { id: string; error: string }[] = [];

    for (const questionId of selectedQuestions) {
      // 检查是否被取消
      if (isCancelledRef.current) {
        break;
      }

      try {
        const response = await axios.post(`/api/questions/${questionId}/generate-answer`);
        
        if (!response.data.success) {
          throw new Error(response.data.error);
        }

        completedCount++;
        setAnswerGenerateProgress(prev => ({
          ...prev,
          current: completedCount,
          message: `正在生成答案... (${completedCount}/${selectedQuestions.length})`
        }));
      } catch (error: any) {
        console.error(`生成问题 ${questionId} 的答案失败:`, error);
        failedQuestions.push({
          id: questionId,
          error: error.response?.data?.error || error.message || '生成答案失败'
        });
        // 即使失败也更新进度
        completedCount++;
        setAnswerGenerateProgress(prev => ({
          ...prev,
          current: completedCount,
          message: `正在生成答案... (${completedCount}/${selectedQuestions.length})`
        }));
      }
    }

    // 更新最终状态
    if (failedQuestions.length > 0) {
      setAnswerGenerateProgress({
        isOpen: true,
        status: 'error',
        message: `部分问题生成答案失败：\n${failedQuestions.map(f => `问题 ${f.id}: ${f.error}`).join('\n')}`,
        current: completedCount,
        total: selectedQuestions.length
      });
      // 清空复选框
      setSelectedQuestions([]);
    } else if (isCancelledRef.current) {
      setAnswerGenerateProgress({
        isOpen: true,
        status: 'cancelled',
        message: `已取消生成，完成了 ${completedCount} 个问题的答案生成`,
        current: completedCount,
        total: selectedQuestions.length
      });
      // 清空复选框
      setSelectedQuestions([]);
    } else {
      setAnswerGenerateProgress({
        isOpen: true,
        status: 'success',
        message: `所有答案生成完成，共生成 ${completedCount} 个答案`,
        current: completedCount,
        total: selectedQuestions.length
      });
      // 清空复选框
      setSelectedQuestions([]);
    }

    // 刷新问题列表
    await fetchQuestions();
  };

  const handleBatchDeleteQuestions = async () => {
    try {
      await axios.post(`/api/questions/batch-delete`, {
        question_ids: selectedQuestions
      });
      
      await fetchQuestions();
      setSelectedQuestions([]);
      setOpenBatchDeleteQuestions(false);
    } catch (error) {
      handleError(error);
      setOpenBatchDeleteQuestions(false); // 出现错误时自动关闭弹窗
    }
  };

  const handleError = (error: any) => {
    console.error('操作失败:', error);
    const errorMessage = error.response?.data?.detail || error.message || '操作失败';
    setErrorSnackbar({
      open: true,
      message: errorMessage
    });
  };

  const handleCloseErrorSnackbar = () => {
    setErrorSnackbar(prev => ({ ...prev, open: false }));
  };

  // 添加查看分块内容的函数
  const handleViewChunkContent = async (question: Question) => {
    try {
      // 获取分块内容
      const response = await axios.get(`/api/texts/chunks`, {
        params: {
          text_id: question.text_id
        }
      });
      
      const chunkContent = response.data[question.chunk_index].content;
      
      setViewingChunkContent({
        textId: question.text_id,
        chunkIndex: question.chunk_index,
        content: chunkContent
      });
      setOpenViewChunkContent(true);
    } catch (error) {
      console.error('获取分块内容失败:', error);
      setError('获取分块内容失败');
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
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <ErrorSnackbar
        open={errorSnackbar.open}
        message={errorSnackbar.message}
        onClose={handleCloseErrorSnackbar}
      />
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
                                    navigate(`/projects/${projectId}/datasets`);
                                    handleFileSelect(text);
                                  }}
                                  sx={{ mr: 1 }}
                                >
                                  查看数据集
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
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />}
                      onClick={() => {
                        if (selectedQuestions.length > 0) {
                          handleBatchGenerateAnswers();
                        }
                      }}
                      disabled={selectedQuestions.length === 0}
                      sx={{ mr: 1 }}
                    >
                      批量生成答案
                    </Button>
                    <Button 
                      variant="contained" 
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => {
                        if (selectedQuestions.length > 0) {
                          setOpenBatchDeleteQuestions(true);
                        }
                      }}
                      disabled={selectedQuestions.length === 0}
                      sx={{ mr: 1 }}
                    >
                      批量删除
                    </Button>
                    <Button variant="contained" startIcon={<AddIcon />}>
                      创建问题
                    </Button>
                  </Box>
                </Box>

                <Paper sx={{ p: 2, mb: 3 }}>
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <Autocomplete
                          value={selectedTextId ? texts.find(t => t.id === selectedTextId) || null : null}
                          onChange={(_, newValue) => {
                            setSelectedTextId(newValue ? newValue.id : null);
                            setSelectedChunkIndex(null);
                            setPage(1);
                          }}
                          options={texts}
                          getOptionLabel={(option) => option.title}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="选择文件"
                              size="small"
                            />
                          )}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                        />
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small" disabled={!selectedTextId}>
                        <Autocomplete
                          value={selectedChunkIndex !== null ? selectedTextChunks[selectedChunkIndex] : null}
                          onChange={(_, newValue) => {
                            setSelectedChunkIndex(newValue ? selectedTextChunks.indexOf(newValue) : null);
                            setPage(1);
                          }}
                          options={selectedTextChunks}
                          getOptionLabel={(option) => `分块 ${selectedTextChunks.indexOf(option) + 1} (${option.content.length} 字符)`}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="选择分块"
                              size="small"
                            />
                          )}
                          isOptionEqualToValue={(option, value) => option === value}
                        />
                      </FormControl>
                    </Grid>
                  </Grid>
                </Paper>

                {questions.length === 0 ? (
                  <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      暂无问题，请先上传文件并生成问题
                    </Typography>
                  </Paper>
                ) : (
                  <>
                    <TableContainer component={Paper}>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell padding="checkbox" align="center">
                              <Checkbox
                                checked={questions.length > 0 && selectedQuestions.length === questions.length}
                                indeterminate={selectedQuestions.length > 0 && selectedQuestions.length < questions.length}
                                onChange={handleSelectAllQuestions}
                              />
                            </TableCell>
                            <TableCell align="center">问题</TableCell>
                            <TableCell align="center">创建时间</TableCell>
                            <TableCell align="center">归属标签</TableCell>
                            <TableCell align="center" sx={{ minWidth: '120px' }}>思维链</TableCell>
                            <TableCell align="center">回答</TableCell>
                            <TableCell align="center">操作</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {questions.map((question) => (
                            <TableRow 
                              key={question.id}
                              sx={{
                                backgroundColor: question.id === highlightedQuestionId ? '#e3f2fd' : 'inherit',
                                transition: 'background-color 0.3s'
                              }}
                              onClick={() => setHighlightedQuestionId(null)}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={selectedQuestions.includes(question.id)}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleSelectQuestion(question.id);
                                  }}
                                />
                              </TableCell>
                              <TableCell>{question.content}</TableCell>
                              <TableCell>{new Date(question.created_at).toLocaleString()}</TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                  {/* 所属文件标签 */}
                                  <Chip
                                    label={texts.find(text => text.id === question.text_id)?.title || '未知文件'}
                                    size="small"
                                    color="info"
                                    variant="outlined"
                                  />
                                  {/* 所属分块标签 */}
                                  <Chip
                                    label={`分块 ${question.chunk_index + 1}`}
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                  />
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography color="text.secondary">
                                  无
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography
                                  sx={{
                                    maxWidth: '200px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {question.answer || '暂无答案'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Tooltip title="编辑问题" arrow>
                                    <IconButton 
                                      size="small" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditQuestion(question);
                                      }}
                                    >
                                      <EditIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="生成答案" arrow>
                                    <IconButton 
                                      size="small"
                                      color="primary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleGenerateAnswer(question);
                                      }}
                                      disabled={state.loading}
                                    >
                                      <QuestionIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="查看分块内容" arrow>
                                    <IconButton 
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleViewChunkContent(question);
                                      }}
                                    >
                                      <VisibilityIcon />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="删除问题" arrow>
                                    <IconButton 
                                      size="small" 
                                      color="error" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteQuestion(question);
                                      }}
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      mt: 2,
                      gap: 2
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                          <Select
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(Number(e.target.value));
                              setPage(1);
                            }}
                          >
                            {pageSizeOptions.map((size) => (
                              <MenuItem key={size} value={size}>
                                {size} 条/页
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Typography color="text.secondary">
                          第 {page}/{Math.ceil(totalQuestions / pageSize)} 页，共 {totalQuestions} 条
                        </Typography>
                      </Box>
                      <Pagination
                        count={Math.ceil(totalQuestions / pageSize)}
                        page={page}
                        onChange={(e, value) => setPage(value)}
                      />
                    </Box>
                  </>
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
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={isAllSelected()}
                              indeterminate={isIndeterminate()}
                              onChange={handleSelectAll}
                              size="small"
                            />
                          }
                          label="全选"
                          sx={{ m: 0 }}
                        />
                        <Typography variant="h6">分块列表</Typography>
                      </Box>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleBatchGenerateQuestions}
                        disabled={state.loading || state.selectedChunks.length === 0}
                      >
                        {state.loading ? '生成中...' : '批量生成问题'}
                      </Button>
                    </Box>
                    {state.selectedFile.chunks.map((chunk, index) => (
                      <Box
                        key={index}
                        sx={{
                          ...styles.chunkItem,
                          ...(state.selectedChunkIndex === index ? { backgroundColor: '#e3f2fd', borderColor: '#2196f3' } : {})
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          <Checkbox
                            checked={state.selectedChunks.includes(index)}
                            onChange={() => handleChunkCheckboxChange(index)}
                            size="small"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Box onClick={() => handleChunkSelect(index)} sx={{ flex: 1 }}>
                            <Typography sx={{ mb: 0.5 }}>分块 {index + 1}</Typography>
                            <Typography sx={styles.chunkSize}>{chunk.content.length} 字符</Typography>
                          </Box>
                          <Chip
                            label={`${chunk.question_count || 0} 个问题`}
                            size="small"
                            color={chunk.question_count ? 'primary' : 'default'}
                            sx={{ ml: 1 }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Box>
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
                    
                    <Paper sx={{ 
                      p: 2, 
                      mb: 3,
                      maxHeight: 'calc(100vh - 450px)',
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': {
                        width: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#888',
                        borderRadius: '4px',
                        '&:hover': {
                          background: '#555',
                        },
                      },
                    }}>
                      <Typography variant="subtitle1" gutterBottom>分块问题列表</Typography>
                      <Box sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                        gap: 2
                      }}>
                        {chunkQuestions.map((question) => (
                          <Card 
                            key={question.id} 
                            sx={{ 
                              height: '100%',
                              cursor: 'pointer',
                              '&:hover': {
                                backgroundColor: '#f5f5f5'
                              }
                            }}
                            onClick={() => handleQuestionCardClick(question)}
                          >
                            <CardContent>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  lineHeight: '1.6'
                                }}
                              >
                                {question.content}
                              </Typography>
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                      {chunkQuestions.length === 0 && (
                        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
                          该分块暂无问题
                        </Typography>
                      )}
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
          if (!state.loading) {
            setOpenGenerateQuestions(false);
            setSelectedTextId(null);
            setError(null);
          }
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
            {state.loading ? '正在生成问题...' : '确定要为选中的分块生成问题吗？这可能需要一些时间。'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            注意：问题生成过程无法打断，开始生成后点击关闭按钮，将在后台继续生成
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (state.loading) {
                setState(prev => ({
                  ...prev,
                  generateProgress: {
                    ...prev.generateProgress,
                    status: 'cancelling',
                    message: '正在取消生成...'
                  }
                }));
              } else {
                setOpenGenerateQuestions(false);
                setSelectedTextId(null);
                setError(null);
              }
            }}
          >
            {state.loading ? '取消' : '关闭'}
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

      <Dialog
        open={openDownload}
        onClose={() => setOpenDownload(false)}
        maxWidth="sm"
        fullWidth
      >
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

      <Dialog
        open={openEditQuestion}
        onClose={() => {
          if (!savingQuestion) {
            setOpenEditQuestion(false);
            setEditingQuestion(null);
          }
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>编辑问题</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>问题内容</Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                p: 2, 
                bgcolor: 'grey.100', 
                borderRadius: 1,
                mb: 3
              }}
            >
              {editingQuestion?.content}
            </Typography>

            <Typography variant="subtitle1" gutterBottom>回答</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={editingAnswer}
              onChange={(e) => setEditingAnswer(e.target.value)}
              sx={{ mb: 3 }}
            />

            <Typography variant="subtitle1" gutterBottom>思维链</Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={editingThoughtChain}
              onChange={(e) => setEditingThoughtChain(e.target.value)}
              placeholder="请输入思维链内容..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setOpenEditQuestion(false);
              setEditingQuestion(null);
            }}
            disabled={savingQuestion}
          >
            取消
          </Button>
          <Button 
            onClick={handleSaveQuestion}
            variant="contained"
            disabled={savingQuestion}
          >
            {savingQuestion ? '保存中...' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={state.generateProgress.isOpen}
        maxWidth="sm"
        fullWidth
        onClose={() => {
          if (state.generateProgress.status !== 'processing') {
            handleCloseProgressDialog();
          }
        }}
      >
        <DialogTitle>生成问题</DialogTitle>
        <DialogContent>
          {state.generateProgress.status === 'processing' && (
            <>
              <LinearProgress sx={{ mt: 1 }} />
              <Typography>
                正在生成第 {state.generateProgress.current + 1} 个分块的问题，共 {state.generateProgress.total} 个
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                注意：开始批量生成后，点击取消按钮无法取消正在生成的分块，只能停止后续分块的生成
              </Typography>
            </>
          )}
          {state.generateProgress.status === 'cancelling' && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography>
                  正在取消批量生成...
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  请等待当前分块生成完成
                </Typography>
              </Box>
            </>
          )}
          {state.generateProgress.status === 'cancelled' && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                {state.generateProgress.message}
              </Alert>
              <Typography>
                已取消生成，完成了 {state.generateProgress.current} 个分块的问题生成
              </Typography>
            </Box>
          )}
          {state.generateProgress.status === 'error' && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ 
                backgroundColor: '#fdeded', 
                color: '#d32f2f',
                padding: 2,
                borderRadius: 1,
                mb: 2
              }}>
                <Typography sx={{ 
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.4
                }}>
                  {state.generateProgress.message}
                </Typography>
              </Box>
              <Typography>
                问题生成失败，请检查报错信息后重试
              </Typography>
            </Box>
          )}
          {state.generateProgress.status === 'success' && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                {state.generateProgress.message}
              </Alert>
              <Typography>
                问题生成完成，共生成 {state.generateProgress.current} 个分块的问题
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (state.generateProgress.status === 'processing') {
                isCancelledRef.current = true;
                setState(prev => ({
                  ...prev,
                  generateProgress: {
                    ...prev.generateProgress,
                    status: 'cancelling',
                    message: '正在取消生成...'
                  }
                }));
              } else {
                handleCloseProgressDialog();
              }
            }}
          >
            {state.generateProgress.status === 'processing' ? '取消' : '关闭'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openGenerateAnswer}
        onClose={() => setOpenGenerateAnswer(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>生成答案</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>确定要为以下问题生成答案吗？</Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 2,
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1
            }}
          >
            {generatingAnswerQuestion?.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGenerateAnswer(false)}>取消</Button>
          <Button
            onClick={handleConfirmGenerateAnswer}
            variant="contained"
          >
            生成答案
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={answerGenerateProgress.isOpen}
        maxWidth="sm"
        fullWidth
        onClose={() => {
          if (answerGenerateProgress.status !== 'processing') {
            setAnswerGenerateProgress(prev => ({ ...prev, isOpen: false }));
          }
        }}
      >
        <DialogTitle>生成答案</DialogTitle>
        <DialogContent>
          {answerGenerateProgress.status === 'processing' && (
            <>
              <LinearProgress sx={{ mt: 1 }} />
              <Typography>
                正在生成第 {answerGenerateProgress.current + 1} 个问题的答案，共 {answerGenerateProgress.total} 个
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                注意：开始批量生成后，点击取消按钮无法取消正在生成的答案，只能停止后续答案的生成
              </Typography>
            </>
          )}
          {answerGenerateProgress.status === 'cancelling' && (
            <>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                <CircularProgress size={40} sx={{ mb: 2 }} />
                <Typography>
                  正在取消批量生成...
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 1 }}>
                  请等待当前问题生成完成
                </Typography>
              </Box>
            </>
          )}
          {answerGenerateProgress.status === 'cancelled' && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="info" sx={{ mb: 2 }}>
                {answerGenerateProgress.message}
              </Alert>
              <Typography>
                已取消生成，完成了 {answerGenerateProgress.current} 个问题的答案生成
              </Typography>
            </Box>
          )}
          {answerGenerateProgress.status === 'error' && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ 
                backgroundColor: '#fdeded', 
                color: '#d32f2f',
                padding: 2,
                borderRadius: 1,
                mb: 2
              }}>
                <Typography sx={{ 
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  lineHeight: 1.4
                }}>
                  {answerGenerateProgress.message}
                </Typography>
              </Box>
              <Typography>
                问题生成失败，请检查报错信息后重试
              </Typography>
            </Box>
          )}
          {answerGenerateProgress.status === 'success' && (
            <Box sx={{ mt: 2 }}>
              <Alert severity="success" sx={{ mb: 2 }}>
                {answerGenerateProgress.message}
              </Alert>
              <Typography>
                答案生成完成，共生成 {answerGenerateProgress.current} 个答案
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (answerGenerateProgress.status === 'processing') {
                isCancelledRef.current = true;
                setAnswerGenerateProgress(prev => ({
                  ...prev,
                  status: 'cancelling',
                  message: '正在取消生成...'
                }));
              } else {
                setAnswerGenerateProgress(prev => ({ ...prev, isOpen: false }));
              }
            }}
          >
            {answerGenerateProgress.status === 'processing' ? '取消' : '关闭'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDeleteQuestion}
        onClose={() => setOpenDeleteQuestion(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>删除问题</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>确定要删除以下问题吗？此操作不可撤销。</Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              mt: 2,
              p: 2,
              bgcolor: 'grey.100',
              borderRadius: 1
            }}
          >
            {deletingQuestion?.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteQuestion(false)}>取消</Button>
          <Button
            onClick={handleConfirmDeleteQuestion}
            color="error"
            variant="contained"
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openBatchDeleteQuestions}
        onClose={() => setOpenBatchDeleteQuestions(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>批量删除问题</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 2 }}>
            确定要删除选中的 {selectedQuestions.length} 个问题吗？此操作不可撤销。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBatchDeleteQuestions(false)}>取消</Button>
          <Button
            onClick={handleBatchDeleteQuestions}
            color="error"
            variant="contained"
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openViewChunkContent}
        onClose={() => setOpenViewChunkContent(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>分块内容</DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-wrap',
              maxHeight: '60vh',
              overflow: 'auto'
            }}
          >
            {viewingChunkContent?.content}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewChunkContent(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 