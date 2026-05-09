import cron from "node-cron";
import User from "../models/User";
import { checkUpcomingCalendarEvents } from "../services/calendarService";

export const calendarCron = cron.schedule("*/15 * * * *", async () => {
  try {
    const users = await User.find({
      googleAccessToken: {
        $exists: true,
        $ne: null
      }
    }).select("_id");

    for (const user of users) {
      await checkUpcomingCalendarEvents(user._id.toString());
    }
  } catch (error) {
    console.error("Scheduled calendar watch failed", error);
  }
});
