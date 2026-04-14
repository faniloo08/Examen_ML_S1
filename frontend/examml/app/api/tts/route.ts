import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const text = searchParams.get("text");

    if (!text) {
      return new NextResponse("Missing text parameter", { status: 400 });
    }

    // Unofficial Google Translate TTS URL
    // 'mg' stands for Malagasy Language Code
    const tl = searchParams.get('tl') || 'mg';
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=${tl}&client=tw-ob`;

    const response = await fetch(ttsUrl);

    if (!response.ok) {
      throw new Error(`Google TTS API responded with status ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();

    // Renvoie le fichier audio directement en tant que stream binaire mp3
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error: any) {
    console.error("Erreur API TTS:", error);
    return new NextResponse("Error generating audio", { status: 500 });
  }
}
