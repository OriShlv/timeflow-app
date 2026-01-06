import "dotenv/config";
import { createServer } from "./app/server";

const port = Number(process.env.PORT ?? 3000);

const app = createServer();
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});
