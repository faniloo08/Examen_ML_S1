import { NextRequest, NextResponse } from "next/server";
import { callChatLLM, type ChatMessage } from "@/services/llm";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Historique de messages invalide" },
        { status: 400 }
      );
    }

    const responseContent = await callChatLLM(messages as ChatMessage[]);

    return NextResponse.json({ content: responseContent });
  } catch (error: any) {
    console.error("Erreur API Chatbot:", error);
    return NextResponse.json(
      { error: error?.message || "Erreur serveur du Chatbot" },
      { status: 500 }
    );
  }
}
