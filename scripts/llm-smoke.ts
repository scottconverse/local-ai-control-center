async function main() {
  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "qwen2.5-coder:14b",
      prompt: "Reply with exactly LOCAL_OK.",
      stream: false,
      options: {
        num_predict: 8
      }
    }),
    signal: AbortSignal.timeout(180_000)
  });

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  const body = (await response.json()) as { response?: string };
  if (!body.response?.includes("LOCAL_OK")) {
    throw new Error(`Unexpected model response: ${body.response ?? "<empty>"}`);
  }

  console.log("Local LLM smoke check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
