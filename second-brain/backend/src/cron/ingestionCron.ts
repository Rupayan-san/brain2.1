import cron from "node-cron";
import User from "../models/User";
import { fetchGmailMessages, fetchSlackMessages } from "../services/ingestionService";

export async function runIngestionForAllUsers() {
  const users = await User.find().select("_id googleAccessToken slackAccessToken");

  for (const user of users) {
    const userId = user._id.toString();

    if (user.googleAccessToken) {
      await fetchGmailMessages(userId);
    }

    if (user.slackAccessToken) {
      await fetchSlackMessages(userId);
    }
  }
}

export const ingestionCron = cron.schedule("*/30 * * * *", async () => {
  try {
    await runIngestionForAllUsers();
  } catch (error) {
    console.error("Scheduled ingestion failed", error);
  }
});
