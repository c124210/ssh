import { OpenAI } from 'openai';
import fs from 'fs';

// Load OpenAI API Key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    console.error('Error: OPENAI_API_KEY not set in the environment.');
    process.exit(1);
}
const openai = new OpenAI({ apiKey });

// Load instructions for ChatGPT
const instructions = fs.readFileSync('instructions.txt', 'utf8');

// Function to get a command suggestion
export async function getCommandSuggestion(query) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                { role: 'system', content: instructions },
                { role: 'user', content: query },
            ],
            temperature: 0.0,
            max_tokens: 100,
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        throw new Error(`ChatGPT Error: ${err.message}`);
    }
}

// Function to get a command description
export async function getCommandDescription(command) {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'You are an AI assistant specializing in Linux commands. Provide a concise explanation.',
                },
                { role: 'user', content: `Explain: ${command}` },
            ],
            temperature: 0.0,
            max_tokens: 100,
        });
        return response.choices[0].message.content.trim();
    } catch (err) {
        throw new Error(`ChatGPT Error: ${err.message}`);
    }
}

