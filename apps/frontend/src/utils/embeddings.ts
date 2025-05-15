import OpenAI from 'openai';

/**
 * Get embeddings from the OpenAI API for the provided text
 * @param text The text to get embeddings for
 * @param apiKey The OpenAI API key
 * @returns An array of embeddings
 */
export async function getEmbeddings(text: string, apiKey: string): Promise<number[]> {
  try {
    // Initialize the OpenAI client with the provided API key
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Allow browser usage
    });

    // Call the embeddings API
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      dimensions: 64 // Using a smaller dimension for our fractal params
    });

    // Return the embedding vector
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error getting embeddings:', error);
    throw error;
  }
} 