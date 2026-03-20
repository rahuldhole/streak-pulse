import { handle } from "hono/netlify";
import app from "../../src/index.ts";

export default handle(app);
