import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "A chave GEMINI_API_KEY não está configurada no servidor (Configurações > Secrets)." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { base64Data } = body;

    if (!base64Data) {
      return NextResponse.json(
        { error: "Nenhum dado base64 foi enviado para processamento." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data
            }
          },
          {
            text: "Extraia os dados deste documento de Transferência de Estoque (Transferência de Produtos/Almoxarifado). Procure por informações como número da transferência, data de emissão, depósito de origem, depósito de destino, transportador ou motorista, e a lista de itens transferidos com código, descrição, quantidade e localização se disponível. Retorne APENAS o JSON conforme o schema."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transfer_number: { type: Type.STRING, description: "Número do documento de transferência" },
            date: { type: Type.STRING, description: "Data da transferência (no formato YYYY-MM-DD)" },
            origin: { type: Type.STRING, description: "Depósito ou local de origem" },
            destination: { type: Type.STRING, description: "Depósito ou local de destino" },
            carrier: { type: Type.STRING, description: "Nome do transportador, motorista ou responsável" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: "Código do produto" },
                  description: { type: Type.STRING, description: "Descrição/Nome do produto" },
                  quantity: { type: Type.NUMBER, description: "Quantidade solicitada/enviada para transferência" },
                  location: { type: Type.STRING, description: "Endereço ou localização do produto no estoque de origem (se houver)" }
                },
                required: ["description", "quantity"]
              }
            }
          },
          required: ["transfer_number", "date", "origin", "destination", "items"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("A IA não retornou nenhum conteúdo.");
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("Erro na API de parsing de transferência via Gemini:", err);
    return NextResponse.json(
      { error: err.message || "Erro inesperado ao extrair dados de transferência do PDF." },
      { status: 500 }
    );
  }
}
