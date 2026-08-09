import { z } from "zod";

// Production CSP intentionally disallows unsafe-eval. Zod's interpreter is
// fully supported and avoids the Function constructor used by its optional JIT.
z.config({ jitless: true });

export { z };
