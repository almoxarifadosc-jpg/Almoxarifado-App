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
            text: "Extraia os dados deste documento (Pedido de Compra ou Separação de OP). Se for Separação de OP, use o número da OP como order_number. O layout tem colunas como: 'Cód.', 'Produto', 'Local' (ou 'Loc.'), 'Nome Coletor', 'Quantidade' e 'Separad'. Extraia: order_number (string), date (string YYYY-MM-DD), supplier_name (string - coloque aqui o nome do PRODUTO principal da primeira tabela), product_location (string - localize a informação 'Local' no cabeçalho ou primeira tabela), total_amount (number - a quantidade total da primeira tabela), e items (array de objetos). REGRAS IMPORTANTES PARA ITENS: 1. Mapeie o valor da coluna 'Quantidade' fisicamente presente no PDF para o campo 'planned_quantity'. 2. O campo 'quantity' deve ser SEMPRE 0 (ele será preenchido pelo usuário depois). 3. Extraia o 'code', 'description', 'location' (vindo da coluna 'Local' ou 'Loc.') e 'collector_name' normally. Retorne APENAS o JSON."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            order_number: { type: Type.STRING },
            date: { type: Type.STRING },
            supplier_name: { type: Type.STRING, description: "Nome do produto principal" },
            product_location: { type: Type.STRING, description: "Local informado na primeira tabela" },
            total_amount: { type: Type.NUMBER, description: "Quantidade total somada ou informada no cabeçalho" },
            type: { type: Type.STRING, description: "Tipo do documento: Pedido ou Separação" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  description: { type: Type.STRING },
                  planned_quantity: { type: Type.NUMBER, description: "Valor da coluna 'Quantidade'" },
                  quantity: { type: Type.NUMBER, description: "Valor da coluna 'Separad'" },
                  collector_name: { type: Type.STRING },
                  location: { type: Type.STRING, description: "Localização específica do item (coluna Local)" },
                  unitPrice: { type: Type.NUMBER },
                  totalPrice: { type: Type.NUMBER }
                },
                required: ["description", "planned_quantity"]
              }
            }
          },
          required: ["order_number", "date", "supplier_name", "items"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("A IA não retornou nenhum conteúdo.");
    }

    return NextResponse.json({ text });
  } catch (err: any) {
    console.error("Erro na API de parsing do Gemini:", err);
    return NextResponse.json(
      { error: err.message || "Erro inesperado ao extrair dados do PDF via Gemini." },
      { status: 500 }
    );
  }
}
