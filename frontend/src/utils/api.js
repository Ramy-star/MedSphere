/**
 * API Client for Voice Assistant Backend
 * Provides functions to interact with backend endpoints:
 * - transcribeAudio: Converts audio to text
 * - sendChat: Sends message to chat API
 * - requestTTS: Converts text to speech
 *
 * Uses relative paths for API calls (no hardcoded backend URL)
 */

import axios from 'axios';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60000, // 60 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API] Response from ${response.config.url}:`, response.status);
    return response;
  },
  (error) => {
    console.error('[API] Response error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * Retry logic for failed requests
 * @param {Function} fn - Function to retry
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Delay between retries in ms
 */
const retryRequest = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      console.warn(`[API] Retry attempt ${i + 1} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }
};

/**
 * Transcribe audio file to text
 * @param {File|Blob} audioFile - Audio file to transcribe
 * @returns {Promise<{text: string}>} Transcribed text
 */
export const transcribeAudio = async (audioFile) => {
  try {
    const formData = new FormData();
    formData.append('file', audioFile, 'audio.webm');

    const response = await retryRequest(() =>
      apiClient.post('/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    );

    return {
      text: response.data.text || response.data.transcription || '',
      success: true,
    };
  } catch (error) {
    console.error('[API] Transcribe error:', error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        'Failed to transcribe audio'
    );
  }
};

/**
 * Send chat message to backend
 * @param {string} message - User message or prompt
 * @param {Object} options - Additional options
 * @param {string} options.modelBrain - Optional model brain context
 * @param {string} options.conversationId - Optional conversation ID
 * @returns {Promise<{response: string}>} Assistant response
 */
export const sendChat = async (message, options = {}) => {
  try {
    const { modelBrain, conversationId } = options;

    // Construct prompt with model brain if provided
    let prompt = message;
    if (modelBrain && modelBrain.trim()) {
      prompt = `${modelBrain}\n\n${message}`;
    }

    const payload = {
      prompt,
      text: message, // Some backends might expect 'text' instead
      conversationId,
    };

    const response = await retryRequest(() =>
      apiClient.post('/chat', payload)
    );

    return {
      response:
        response.data.response ||
        response.data.message ||
        response.data.text ||
        '',
      success: true,
    };
  } catch (error) {
    console.error('[API] Chat error:', error);
    throw new Error(
      error.response?.data?.message || error.message || 'Failed to send message'
    );
  }
};

/**
 * Request text-to-speech audio
 * @param {string} text - Text to convert to speech
 * @returns {Promise<{audioUrl: string, audioBlob: Blob}>} Audio data
 */
export const requestTTS = async (text) => {
  try {
    const response = await retryRequest(() =>
      apiClient.post(
        '/tts',
        { text },
        {
          responseType: 'blob', // Expect binary data
        }
      )
    );

    // Check if response is JSON (file path) or binary (audio blob)
    const contentType = response.headers['content-type'];

    if (contentType.includes('application/json')) {
      // Backend returned a file path
      const textData = await response.data.text();
      const jsonData = JSON.parse(textData);
      return {
        audioUrl: jsonData.path || jsonData.url || jsonData.file,
        success: true,
      };
    } else {
      // Backend returned audio blob
      const audioBlob = new Blob([response.data], {
        type: contentType || 'audio/mpeg',
      });
      const audioUrl = URL.createObjectURL(audioBlob);

      return {
        audioUrl,
        audioBlob,
        success: true,
      };
    }
  } catch (error) {
    console.error('[API] TTS error:', error);
    throw new Error(
      error.response?.data?.message ||
        error.message ||
        'Failed to generate speech'
    );
  }
};

/**
 * Clean up blob URLs to prevent memory leaks
 * @param {string} url - Blob URL to revoke
 */
export const revokeBlobUrl = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

export default {
  transcribeAudio,
  sendChat,
  requestTTS,
  revokeBlobUrl,
};
