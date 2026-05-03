// AI question generator for Intellekt Academy
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topicTitle, topicContent, count, language = "uz", extraInstructions = "" } = await req.json();

    const n = Math.max(1, Math.min(1000, Number(count) || 10));
    if (!topicContent || typeof topicContent !== "string" || topicContent.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Mavzu materiali yetarli emas (kamida 20 ta belgi)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Siz O'zbekistonlik tajribali o'qituvchisiz. Berilgan mavzu materialiga asoslanib, sifatli test savollarini yaratasiz. Har bir savolda 4 ta variant (a, b, c, d) bo'lishi va faqat bittasi to'g'ri bo'lishi shart. Savollar mavzuni chuqur tushunishga qaratilgan, aniq va noto'g'ri tushunishga olib kelmaydigan bo'lishi kerak. Barcha matn ${language === "uz" ? "o'zbek tilida" : language} bo'lsin.`;

    const userPrompt = `Mavzu: "${topicTitle}"\n\nMaterial:\n${topicContent}\n\nIltimos, ushbu material bo'yicha aynan ${n} ta turli xil va takrorlanmaydigan test savollari yarating.${extraInstructions ? "\n\nQo'shimcha: " + extraInstructions : ""}`;

    // Batch into chunks of ≤25 to keep responses fast & reliable
    const CHUNK = 25;
    const all: any[] = [];

    for (let i = 0; i < n; i += CHUNK) {
      const need = Math.min(CHUNK, n - i);
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt + `\n\n(Hozir aynan ${need} ta savol qaytaring. Avval yaratilgan savollarni takrorlamang. Tartib raqami: ${i + 1}-${i + need}.)` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "save_questions",
              description: "Yaratilgan test savollarini saqlash",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question_text: { type: "string" },
                        option_a: { type: "string" },
                        option_b: { type: "string" },
                        option_c: { type: "string" },
                        option_d: { type: "string" },
                        correct_option: { type: "string", enum: ["a", "b", "c", "d"] },
                      },
                      required: ["question_text", "option_a", "option_b", "option_c", "option_d", "correct_option"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "save_questions" } },
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) return new Response(JSON.stringify({ error: "AI so'rovlar limiti oshib ketdi, biroz kuting" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (resp.status === 402) return new Response(JSON.stringify({ error: "AI kreditlari tugadi. Workspace sozlamalarida to'ldiring." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await resp.text();
        console.error("AI gateway error", resp.status, t);
        return new Response(JSON.stringify({ error: "AI xizmati xatoligi" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await resp.json();
      const call = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!call) { console.error("No tool call", JSON.stringify(data).slice(0, 500)); continue; }
      try {
        const args = JSON.parse(call.function.arguments);
        if (Array.isArray(args.questions)) all.push(...args.questions);
      } catch (e) { console.error("Parse error", e); }
    }

    return new Response(JSON.stringify({ questions: all.slice(0, n) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-generate-questions error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
