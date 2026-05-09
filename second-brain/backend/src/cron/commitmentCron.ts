import cron from "node-cron";
import User from "../models/User";
import { checkFulfillments } from "../services/commitmentService";

export const commitmentCron = cron.schedule("0 9 * * 1", async () => {
  try {
    const users = await User.find().select("_id");

    for (const user of users) {
      await checkFulfillments(user._id.toString());
    }
  } catch (error) {
    console.error("Scheduled commitment fulfillment check failed", error);
  }
});
