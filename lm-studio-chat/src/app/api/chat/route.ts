import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Connect to LM Studio running locally
    const response = await fetch('http://localhost:1234/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        model: 'local-model', // LM Studio will use the currently loaded model
        temperature: 0.7,
        max_tokens: 1000,
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
