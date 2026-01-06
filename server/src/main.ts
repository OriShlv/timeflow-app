import "dotenv/config";
import { createServer } from "./app/server";
import { env } from "./config/env";

const app = createServer();
app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${env.PORT}`);
});
