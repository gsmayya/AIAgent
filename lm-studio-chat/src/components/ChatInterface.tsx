'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import { FiSend, FiPaperclip, FiX } from 'react-icons/fi';
import ChatMessage from './ChatMessage';

export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  preview?: string;
  content?: string; // Base64 or text content of the file
}

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
      Array.from(e.target.files).forEach(file => {
        let preview = undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }
        
        // Read file content
        const reader = new FileReader();
        
        reader.onload = (event) => {
          try {
            const newFile: FileAttachment = {
              name: file.name,
              size: file.size,
              type: file.type,
              preview,
              content: event.target?.result as string
            };
            setSelectedFiles(prev => [...prev, newFile]);
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            // Add file without content if there was an error
            const newFile: FileAttachment = {
              name: file.name,
              size: file.size,
              type: file.type,
              preview
            };
            setSelectedFiles(prev => [...prev, newFile]);
          }
        };
        
        reader.onerror = () => {
          console.error(`Error reading file ${file.name}`);
          // Add file without content if there was an error
          const newFile: FileAttachment = {
            name: file.name,
            size: file.size,
            type: file.type,
            preview
          };
          setSelectedFiles(prev => [...prev, newFile]);
        };
        
        if (file.type.startsWith('text/') || 
            file.type === 'application/json' ||
            file.type === 'application/xml' ||
            file.name.endsWith('.md') ||
            file.name.endsWith('.csv')) {
          reader.readAsText(file);
        } else {
          reader.readAsDataURL(file); // Base64 encode binary files
        }
      });
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
      // Create request options based on whether there are files
      let requestOptions;
      if (filesToSend.length > 0) {
        // Create a message with file context
        let messageWithFileContext = userMessage;
        
        // For each file, append its content to the message
        filesToSend.forEach((fileAttachment, index) => {
          try {
            if (fileAttachment.content) {
              // For text files, append the content directly
              if (fileAttachment.type.startsWith('text/') || 
                  fileAttachment.type === 'application/json' ||
                  fileAttachment.type === 'application/xml' ||
                  fileAttachment.name.endsWith('.md') ||
                  fileAttachment.name.endsWith('.csv')) {
                // Extract content from base64 if needed
                let fileContent = fileAttachment.content;
                if (fileContent.startsWith('data:')) {
                  // Extract content from data URL
                  const contentParts = fileContent.split(',');
                  if (contentParts.length > 1) {
                    fileContent = contentParts[1];
                    // Decode base64 if necessary
                    try {
                      fileContent = atob(fileContent);
                    } catch (e) {
                      console.error('Error decoding base64:', e);
                      // Continue with encoded content if decoding fails
                    }
                  }
                }
                
                // Limit content length to prevent huge messages
                const maxLength = 10000;
                if (fileContent.length > maxLength) {
                  fileContent = fileContent.substring(0, maxLength) + '...\n[Content truncated due to size]';
                }
                
                messageWithFileContext += `\n\nFile: ${fileAttachment.name}\nContent:\n${fileContent}`;
              } else {
                // For binary files, just mention the file
                messageWithFileContext += `\n\nFile: ${fileAttachment.name} (binary file, size: ${fileAttachment.size} bytes)`;
              }
            } else {
              // If content couldn't be read
              messageWithFileContext += `\n\nFile: ${fileAttachment.name} (content unavailable)`;
            }
          } catch (error) {
            console.error(`Error processing file ${fileAttachment.name}:`, error);
            messageWithFileContext += `\n\nFile: ${fileAttachment.name} (error processing file)`;
          }
        });
        
        requestOptions = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            message: messageWithFileContext,
            files: filesToSend.map(file => ({
              name: file.name,
              size: file.size,
              type: file.type
            }))
          }),
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

      console.log('Message sent successfully:', data);
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
      
      {/* Display selected files */}
      {selectedFiles.length > 0 && (
        <div className="border-t dark:border-gray-700 p-2">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center bg-gray-200 dark:bg-gray-700 rounded-lg p-2">
                <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                <button 
                  onClick={() => removeFile(index)}
                  className="ml-2 text-gray-500 hover:text-red-500"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
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
          
          {/* File upload button */}
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={isLoading}
            className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 p-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FiPaperclip className="w-6 h-6" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            multiple
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

