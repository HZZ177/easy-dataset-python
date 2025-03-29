import axios, { AxiosResponse } from 'axios';

const instance = axios.create({
  baseURL: '/api',  // 修改这里，明确指定 baseURL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 响应拦截器
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error) => {
    console.error('API请求错误:', error);
    // 添加更详细的错误日志
    if (error.response) {
      console.error('错误响应:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
      });
    } else if (error.request) {
      console.error('请求未收到响应:', error.request);
    } else {
      console.error('请求配置错误:', error.message);
    }
    return Promise.reject(error);
  }
);

export default instance; 
