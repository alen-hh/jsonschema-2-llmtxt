
import { GoogleGenAI } from "@google/genai";

export const convertToLlmTxt = async (jsonContent: string): Promise<string> => {
  // Use process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    You are a technical documentation expert specializing in the "llm.txt" format.
    Your goal is to convert an OpenAPI JSON specification into a high-quality "llm.txt" Markdown file optimized for LLMs.
    
    Rules for llm.txt structure:
    1. Start with a single H1 (#) for the API title.
    2. Follow with a concise plain-text summary of the API's purpose.
    3. Use H2 (##) headers for major categories (e.g., "Endpoints", "Authentication").
    4. Each API endpoint must be an H3 (###) in the format: "METHOD /path - Brief Description".
    
    Rules for Endpoint Detail (MANDATORY):
    For each endpoint, you MUST provide these distinct sections:
    
    #### Input
    - List ALL parameters (path, query, header, cookie). Include Name, Type, and Description.
    - Request Body fields: Name, Type, Description, Default, and Enums.
    
    **Required Parameters Example**:
    - Provide a JSON block containing only the mandatory fields.
    
    **Full Example**:
    - Provide a JSON block containing all available fields with realistic example values.
    
    #### Output
    - Describe the successful response (e.g., 200 OK) and all error codes.
    - List fields returned in the response with Type and Description.
    
    **Example Response**:
    - Provide a JSON block of a typical successful response.
    
    #### Usage Examples
    
    ##### cURL
    - Provide a "cURL" example for the endpoint.
    
    General Formatting:
    - Be concise but technically complete. 
    - Use Markdown lists for parameters and fields.
    - Use code blocks or backticks for types and names.
    - Ensure the output is strictly valid Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Please convert this OpenAPI JSON into a detailed llm.txt formatted Markdown. For every endpoint, include Input/Output sections with types, descriptions, and MUST include JSON blocks for "Required Parameters Example", "Full Example", "Example Response", and a Usage Examples section with a "cURL" sub-heading (using #### and ##### respectively):\n\n${jsonContent}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
      },
    });

    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    return response.text;
  } catch (error) {
    console.error("Gemini Conversion Error:", error);
    throw new Error("Failed to process the OpenAPI spec. Please ensure it is a valid JSON.");
  }
};
