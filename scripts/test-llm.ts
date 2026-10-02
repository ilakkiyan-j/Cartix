import axios from 'axios';
import { config } from '../src/config/env.js';

async function main() {
  const key = config.LLM_API_KEY;
  console.log('Testing Gemini API key:', key.substring(0, 8) + '...');

  try {
    const listRes = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    console.log('Available models:');
    const modelNames = (listRes.data.models || []).map((m: any) => m.name);
    console.log(modelNames);

    // Test a basic generateContent with one of the available models that support generateContent
    const genModels = (listRes.data.models || []).filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'));
    console.log('\nModels supporting generateContent:', genModels.map((m: any) => m.name));

    const testModel = 'gemini-3.8-flash';
    console.log(`\nTesting generateContent with ${testModel}...`);
    const testRes = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${key}`, {
      contents: [{ role: 'user', parts: [{ text: 'Hello, respond with Pong' }] }]
    });
    console.log('Response:', testRes.data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (err: any) {
    console.error('API Error:', err.response?.data || err.message);
  }
}

main();
