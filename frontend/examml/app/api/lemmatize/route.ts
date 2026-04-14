import { NextRequest, NextResponse } from "next/server";
import { getLemmatization } from "@/services/lemmatizer";

export async function POST(req: NextRequest) {
  try {
    const { word } = await req.json();

    if (!word) {
      return NextResponse.json(
        { error: "Mot requis pour la lemmatisation" },
        { status: 400 }
      );
    }

    const res = await getLemmatization(word);

    return NextResponse.json(res);
  } catch (error) {
    console.error("Erreur API Lemmatize:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la lemmatisation" },
      { status: 500 }
    );
  }
}
