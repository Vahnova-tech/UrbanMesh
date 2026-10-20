import { createApp } from "./app.js";
import { env, resolveAdminToken } from "./lib/env.js";

resolveAdminToken();
const app = createApp();

app.listen(env.port, env.host, () => {
  console.log(`UrbanMesh listening on ${env.host}:${env.port}`);
  console.log(
    `  clustering: ≥${env.clusterThreshold} reports within ${env.clusterRadiusMeters} m`,
  );
  console.log(
    env.adminApiToken
      ? "  admin: ADMIN_API_TOKEN configured"
      : "  admin: using local DEV token (set ADMIN_API_TOKEN before shared deploys)",
  );
  if (env.webDist) console.log(`  citizen app: ${env.webDist}`);
  if (env.dashboardDist) console.log(`  planner app: ${env.dashboardDist}`);
  if (env.adminDist) console.log(`  admin app: ${env.adminDist}`);
});
