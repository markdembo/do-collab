import { getCloudflareContext } from "@opennextjs/cloudflare";
 
export async function POST() {
    const { env } = getCloudflareContext();
    return await fetch(`https://${env.HOSTNAME}/generate`, {
      method: "POST",
    });
}