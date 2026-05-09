import { google } from "googleapis";
import cron from "node-cron";
import { emitToUser } from "../lib/socket";
import MeetingBrief from "../models/MeetingBrief";
import User from "../models/User";
import { generateBrief } from "./meetingBriefService";

const watchedUsers = new Set<string>();

export function watchCalendar(userId: string) {
  if (watchedUsers.has(userId)) {
    return;
  }

  watchedUsers.add(userId);
  cron.schedule("*/15 * * * *", async () => {
    await checkUpcomingCalendarEvents(userId);
  });
}

export async function checkUpcomingCalendarEvents(userId: string) {
  const user = await User.findById(userId);

  if (!user?.googleAccessToken) {
    return [];
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: user.googleAccessToken });

  const calendar = google.calendar({ version: "v3", auth });
  const now = new Date();
  const nextThirtyMinutes = new Date(now.getTime() + 30 * 60 * 1000);
  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: now.toISOString(),
    timeMax: nextThirtyMinutes.toISOString(),
    singleEvents: true,
    orderBy: "startTime"
  });
  const events = response.data.items ?? [];
  const briefs = [];

  for (const event of events) {
    const meetingTitle = event.summary ?? "Untitled meeting";
    const meetingStart = event.start?.dateTime ?? event.start?.date;

    if (!meetingStart) {
      continue;
    }

    const meetingTime = new Date(meetingStart);
    const existingBrief = await MeetingBrief.findOne({
      userId,
      meetingTitle,
      meetingTime
    });

    if (existingBrief) {
      briefs.push(existingBrief);
      continue;
    }

    const attendees =
      event.attendees
        ?.map((attendee) => attendee.displayName || attendee.email)
        .filter((attendee): attendee is string => Boolean(attendee)) ?? [];
    const brief = await generateBrief(userId, meetingTitle, attendees, meetingTime);

    emitToUser(userId, "meetingBrief", {
      brief
    });
    briefs.push(brief);
  }

  return briefs;
}
