import axios from 'axios';

// Create an Axios instance with base URL
const axiosInstance = axios.create({
  baseURL: 'https://prettylightslive.com/wp-json/custom/v1/', // replace with your API base URL
  timeout: 10000, // set timeout (optional)
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;
