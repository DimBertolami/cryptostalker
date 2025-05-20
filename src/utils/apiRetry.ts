import axios from 'axios';

const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 3,
  retryDelay: 1000,
  retryOnStatusCodes: [429, 500, 502, 503, 504]
};

export const withRetry = async (axiosRequest: any, options = DEFAULT_RETRY_OPTIONS) => {
  const { maxRetries, retryDelay, retryOnStatusCodes } = options;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      const response = await axiosRequest();
      return response;
    } catch (error: any) {
      const statusCode = error.response?.status;
      
      if (!retryOnStatusCodes.includes(statusCode)) {
        throw error;
      }

      if (retryCount === maxRetries) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = retryDelay * Math.pow(2, retryCount);
      console.log(`Retrying request in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }
};
