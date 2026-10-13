import { createApp } from "./app.js";
import { env } from "./lib/env.js";

const app = createApp();

app.listen(env.port, env.host, () => {
  console.log(`UrbanMesh listening on ${env.host}:${env.port}`);
  console.log(
    `  clustering: ≥${env.clusterThreshold} reports within ${env.clusterRadiusMeters} m`,
  );
  if (env.webDist) console.log(`  citizen app: ${env.webDist}`);
  if (env.dashboardDist) console.log(`  planner app: ${env.dashboardDist}`);
});
