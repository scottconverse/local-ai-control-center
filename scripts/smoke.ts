async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function check(url: string) {
  let lastError = "";

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (response.ok) {
        return;
      }
      lastError = `${url} returned ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await sleep(2_000);
  }

  throw new Error(`${url} did not become healthy. Last error: ${lastError}`);
}

async function main() {
  await check("http://127.0.0.1:11434/api/tags");
  await check("http://localhost:3000");
  await check("http://localhost:8080");
  console.log("Smoke checks passed: Ollama, OpenHands, and Open WebUI are reachable.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
