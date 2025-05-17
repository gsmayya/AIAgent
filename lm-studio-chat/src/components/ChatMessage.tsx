import { useState } from 'react';
import { FiFile, FiFileText, FiImage, FiPaperclip } from 'react-icons/fi';

export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  preview?: string;
}

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  files?: FileAttachment[];
}

// Helper function to get appropriate icon based on file type
const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) {
    return <FiImage className="w-5 h-5" />;
  } else if (fileType.startsWith('text/')) {
    return <FiFileText className="w-5 h-5" />;
  } else if (fileType.includes('pdf') || fileType.includes('document')) {
    return <FiFile className="w-5 h-5" />;
  } else {
    return <FiPaperclip className="w-5 h-5" />;
  }
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
};

export default function ChatMessage({ message, isUser, files }: ChatMessageProps) {
  const hasFiles = files && files.length > 0;
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  
  return (
    <>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div
          className={`${
            isUser
              ? 'bg-blue-500 dark:bg-blue-600 text-white rounded-bl-lg rounded-tl-lg rounded-tr-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-br-lg rounded-tr-lg rounded-tl-lg'
          } p-3 max-w-[70%] break-words`}
        >
          {message && <div className={hasFiles ? 'mb-3' : ''}>{message}</div>}
          
          {hasFiles && (
            <div className={`flex flex-col gap-2 ${message ? (isUser ? 'border-t border-blue-400 dark:border-blue-500 pt-2' : 'border-t border-gray-300 dark:border-gray-600 pt-2') : ''}`}>
              {files.map((file, index) => (
                <div key={index} className="flex flex-col">
                  {file.type.startsWith('image/') && file.preview ? (
                    <div>
                      <img 
                        src={file.preview} 
                        alt={file.name}
                        className="max-w-full rounded-md object-cover cursor-pointer"
                        style={{ maxHeight: '150px' }}
                        onClick={() => setExpandedImage(file.preview)}
                      />
                      <p className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {file.name} ({formatFileSize(file.size)})
                      </p>
                    </div>
                  ) : (
                    <div className={`flex items-center p-2 rounded ${isUser ? 'bg-blue-400 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className="mr-2">{getFileIcon(file.type)}</span>
                      <div>
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className={`text-xs ${isUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Image preview modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img 
              src={expandedImage} 
              alt="Enlarged preview" 
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button 
              className="absolute top-2 right-2 bg-white dark:bg-gray-800 text-black dark:text-white rounded-full w-8 h-8 flex items-center justify-center text-xl"
              onClick={() => setExpandedImage(null)}
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}

