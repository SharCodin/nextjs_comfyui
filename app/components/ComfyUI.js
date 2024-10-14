'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

import workflowApi from './workflow_api.json'


const serverAddress = "127.0.0.1:8188";
const clientId = uuidv4();

async function queuePrompt(prompt) {
  const response = await fetch(`http://${serverAddress}/prompt`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, client_id: clientId }),
  });
  return response.json();
}

async function getImage(filename, subfolder, folderType) {
  const params = new URLSearchParams({ filename, subfolder, type: folderType });
  const response = await fetch(`http://${serverAddress}/view?${params}`);
  return response.arrayBuffer();
}

async function getHistory(promptId) {
  const response = await fetch(`http://${serverAddress}/history/${promptId}`);
  return response.json();
}

export default function ComfyUI() {
  const [images, setImages] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerateImages = async () => {
    setIsLoading(true);
    setError(null);

    const prompt = workflowApi;

    try {
      const ws = new WebSocket(`ws://${serverAddress}/ws?clientId=${clientId}`);
      
      ws.onopen = async () => {
        console.log('WebSocket connection established.');
        const { prompt_id } = await queuePrompt(prompt);
        
        ws.onmessage = async (event) => {
          const message = JSON.parse(event.data);
          if (message.type === 'executing' && message.data.node === null && message.data.prompt_id === prompt_id) {
            const history = await getHistory(prompt_id);
            const outputImages = {};
            
            for (const [nodeId, nodeOutput] of Object.entries(history[prompt_id].outputs)) {
              if (nodeOutput.images) {
                outputImages[nodeId] = await Promise.all(
                  nodeOutput.images.map(image => 
                    getImage(image.filename, image.subfolder, image.type)
                  )
                );
              }
            }
            
            setImages(outputImages);
            ws.close();
          }
        };
      };

      ws.onerror = (error) => {
        setError('WebSocket error: ' + error.message);
        setIsLoading(false);
      };

    } catch (error) {
      setError('Error generating images: ' + error.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (images) {
      setIsLoading(false);
    }
  }, [images]);

  return (
    <div>
      <button onClick={handleGenerateImages} disabled={isLoading}>
        {isLoading ? 'Generating...' : 'Generate Images'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {images && (
        <div>
          {Object.entries(images).map(([nodeId, nodeImages]) => (
            <div key={nodeId}>
              <h3>Node {nodeId}</h3>
              {nodeImages.map((imageData, index) => (
                <img 
                  key={index} 
                  src={URL.createObjectURL(new Blob([imageData], { type: 'image/png' }))} 
                  alt={`Generated image ${index + 1}`} 
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}