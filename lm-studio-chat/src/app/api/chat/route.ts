import { NextRequest, NextResponse } from 'next/server';

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

interface ChatRequest {
  message: string;
  files?: FileInfo[];
}

export async function POST(req: NextRequest) {
  try {
    const { message, files } = await req.json() as ChatRequest;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Process any file information that might be in the message
    let formattedMessage = message;
    
    // If there are files mentioned in the request, log them
    if (files && files.length > 0) {
      console.log(`Processing message with ${files.length} file(s)`);
      // File information is already embedded in the message by the client
      // But we can add additional context if needed
      
      const filesSummary = files.map(file => 
        `- ${file.name} (${file.type}, ${formatFileSize(file.size)})`
      ).join('\n');
      
      // Add a system note about the files if not already included
      if (!formattedMessage.includes("File:")) {
        formattedMessage = `The user has uploaded the following files:\n${filesSummary}\n\nUser message: ${formattedMessage}`;
      }
    }

    // Connect to LM Studio running locally
    const response = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: formattedMessage }],
        model: 'local-model', // LM Studio will use the currently loaded model
        temperature: 0.7,
        max_tokens: 2000, // Increased for longer responses that may include file analysis
        stream: false
      }),
    });

    if (!response.ok) {
      console.error('LM Studio API error:', response.status);
      return NextResponse.json(
        { error: 'Failed to connect to LM Studio. Make sure it\'s running with the local server enabled.' },
        { status: response.status }
      );
    }

    try {
      const data = await response.json();
      const assistantMessage = data.choices?.[0]?.message?.content || 'No response from the model';
      
      return NextResponse.json({ response: assistantMessage });
    } catch (error) {
      console.error('Error parsing LM Studio response:', error);
      return NextResponse.json(
        { error: 'Failed to parse response from LM Studio' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + ' KB';
  } else {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
