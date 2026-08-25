import { WebWorkerMLCEngineHandler } from "https://esm.run/@mlc-ai/web-llm@0.2.84";

// The model and all generation work live in this browser worker, never on an AI API.
const handler = new WebWorkerMLCEngineHandler();
self.onmessage = (message) => handler.onmessage(message);
