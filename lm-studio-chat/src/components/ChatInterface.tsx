'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { FiSend, FiPaperclip, FiX } from 'react-icons/fi';
import ChatMessage, { FileAttachment } from './ChatMessage';

interface Message {
  text: string;
  isUser: boolean;
  files?: FileAttachment[];
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileAttachment[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: FileAttachment[] = Array.from(e.target.files).map(file => {
        let preview = undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          preview
        };
      });
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      // Revoke object URL if it exists
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (((!input.trim() && selectedFiles.length === 0) || isLoading)) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true, files: selectedFiles.length > 0 ? [...selectedFiles] : undefined }]);
    setIsLoading(true);
    
    // Clear selected files after sending
    const filesToSend = [...selectedFiles];
    setSelectedFiles([]);

    try {
      // Create FormData if there are files
      let requestOptions;
      if (filesToSend.length > 0) {
        const formData = new FormData();
        formData.append('message', userMessage);
        
        // Add files to FormData
        filesToSend.forEach((fileAttachment, index) => {
          // In a real implementation, you would have the actual File objects
          // This is a simplified version - in production, you'd need to track the original File objects
          // and append them here instead of the file attachment metadata
          // formData.append(`files[${index}]`, actualFileObject);
          
          // For demo purposes:
          formData.append(`fileInfo[${index}]`, JSON.stringify({
            name: fileAttachment.name,
            size: fileAttachment.size,
            type: fileAttachment.type
          }));
        });
        
        requestOptions = {
          method: 'POST',
          body: formData,
        };
      } else {
        requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: userMessage }),
        };
      }
      
      const response = await fetch('/api/chat', requestOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // In a real implementation, the server might return file information in the response
      setMessages(prev => [...prev, { text: data.response, isUser: false }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { 
          text: 'Error: Make sure LM Studio is running and the local server is enabled on port 1234',
          isUser: false 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-4">
            Start a conversation by typing a message below
          </div>
        )}
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message.text} isUser={message.isUser} files={message.files} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-lg animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="border-t dark:border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="bg-blue-500 dark:bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:bg-blue-300 dark:disabled:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FiSend className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
}

