// services/llm.ts

export async function callLLM(prompt: string) {
  const res = await fetch(`${process.env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct-v0.1",
      messages: [{ role: "user", content: prompt }]
    })
  })

  const data = await res.json()
  return data.choices[0].message.content
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function callChatLLM(messages: ChatMessage[]) {
  const res = await fetch(`${process.env.OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "ExamML",
    },
    body: JSON.stringify({
      model: "mistralai/mistral-7b-instruct-v0.1",
      messages: [
        { role: "system", content: "Tu es un assistant IA spécialisé dans la langue et la culture malgache." },
        ...messages
      ]
    })
  })

  const data = await res.json()
  if (data.error) throw new Error(data.error.message || "Erreur LLM");
  return data.choices[0].message.content
}