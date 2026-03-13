import { readFileSync } from 'fs';
import { resolve } from 'path';
import { TestUser, testConfiguration, TestUserManager } from '@alkemio/tests-lib';
import { graphqlErrorWrapper } from '@alkemio/tests-lib/utils/graphql.wrapper';
import { CalendarEventType } from '@alkemio/tests-lib/core/generated/alkemio-schema';
import { GraphQLClient } from 'graphql-request';

const graphqlClient = new GraphQLClient(
  testConfiguration.endPoints.graphql.private
);

// --- Response Types ---

export interface CalendarEventLocation {
  city: string;
  country: string;
}

export interface CalendarEventProfile {
  displayName: string;
  description: string;
  url: string;
  location?: CalendarEventLocation;
}

export interface CalendarEventData {
  id: string;
  nameID?: string;
  profile: CalendarEventProfile;
  type: string;
  wholeDay: boolean;
  multipleDays: boolean;
  startDate: string;
  durationMinutes: number;
  durationDays?: number;
  googleCalendarUrl?: string;
  outlookCalendarUrl?: string;
  icsDownloadUrl?: string;
  createdBy?: { id: string; nameID: string };
}

interface CreateCalendarEventResponse {
  createEventOnCalendar: CalendarEventData;
}

interface UpdateCalendarEventResponse {
  updateCalendarEvent: CalendarEventData;
}

interface DeleteCalendarEventResponse {
  deleteCalendarEvent: { id: string };
}

interface GetSpaceCalendarIdResponse {
  lookup: {
    space: {
      collaboration: {
        timeline: { calendar: { id: string } };
      };
    };
  };
}

interface GetCalendarEventsResponse {
  lookup: {
    space: {
      collaboration: {
        timeline: {
          calendar: {
            id: string;
            events: CalendarEventData[];
          };
        };
      };
    };
  };
}

interface GetCalendarEventByIdResponse {
  lookup: {
    calendarEvent: CalendarEventData | null;
  };
}

// --- Load .graphql files from lib ---

const libGraphqlPath = resolve(__dirname, '../../../../lib/src/scenario/graphql');

const loadQuery = (relativePath: string) =>
  readFileSync(resolve(libGraphqlPath, relativePath), 'utf-8');

const CREATE_CALENDAR_EVENT = loadQuery('mutations/calendar/createCalendarEvent.graphql');
const UPDATE_CALENDAR_EVENT = loadQuery('mutations/calendar/updateCalendarEvent.graphql');
const DELETE_CALENDAR_EVENT = loadQuery('mutations/calendar/deleteCalendarEvent.graphql');
const GET_SPACE_CALENDAR_ID = loadQuery('queries/calendar/getSpaceCalendarId.graphql');
const GET_CALENDAR_EVENTS = loadQuery('queries/calendar/getCalendarEvents.graphql');
const GET_CALENDAR_EVENT_BY_ID = loadQuery('queries/calendar/getCalendarEventById.graphql');

// --- Query Helpers ---

export const getSpaceCalendarId = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<GetSpaceCalendarIdResponse>(
      GET_SPACE_CALENDAR_ID,
      { spaceId },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getCalendarEvents = async (
  spaceId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<GetCalendarEventsResponse>(
      GET_CALENDAR_EVENTS,
      { spaceId },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const getCalendarEventById = async (
  eventId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<GetCalendarEventByIdResponse>(
      GET_CALENDAR_EVENT_BY_ID,
      { eventId },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  return graphqlErrorWrapper(callback, userRole);
};

// --- Mutation Helpers ---

export const createCalendarEventOnCalendar = async (
  calendarID: string,
  options: {
    displayName: string;
    description?: string;
    startDate: string;
    durationMinutes: number;
    durationDays?: number;
    multipleDays: boolean;
    wholeDay: boolean;
    type?: CalendarEventType;
    nameID?: string;
    tags?: string[];
    location?: { city?: string; country?: string };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const eventData = {
    calendarID,
    profileData: {
      displayName: options.displayName,
      description: options.description,
      location: options.location,
    },
    startDate: options.startDate,
    durationMinutes: options.durationMinutes,
    durationDays: options.durationDays,
    multipleDays: options.multipleDays,
    wholeDay: options.wholeDay,
    type: options.type ?? CalendarEventType.Event,
    visibleOnParentCalendar: true,
    nameID: options.nameID,
    tags: options.tags,
  };

  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<CreateCalendarEventResponse>(
      CREATE_CALENDAR_EVENT,
      { eventData },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const updateCalendarEvent = async (
  eventId: string,
  options: {
    displayName?: string;
    description?: string;
    startDate: string;
    durationMinutes: number;
    durationDays?: number;
    multipleDays: boolean;
    wholeDay: boolean;
    type?: CalendarEventType;
    nameID?: string;
    location?: { city?: string; country?: string };
  },
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const eventData: Record<string, unknown> = {
    ID: eventId,
    startDate: options.startDate,
    durationMinutes: options.durationMinutes,
    durationDays: options.durationDays,
    multipleDays: options.multipleDays,
    wholeDay: options.wholeDay,
    type: options.type,
    nameID: options.nameID,
  };

  if (options.displayName || options.description || options.location) {
    eventData.profileData = {
      displayName: options.displayName,
      description: options.description,
      location: options.location,
    };
  }

  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<UpdateCalendarEventResponse>(
      UPDATE_CALENDAR_EVENT,
      { eventData },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  return graphqlErrorWrapper(callback, userRole);
};

export const deleteCalendarEvent = async (
  eventId: string,
  userRole: TestUser = TestUser.GLOBAL_ADMIN
) => {
  const callback = (authToken: string | undefined) =>
    graphqlClient.rawRequest<DeleteCalendarEventResponse>(
      DELETE_CALENDAR_EVENT,
      { deleteData: { ID: eventId } },
      authToken ? { authorization: `Bearer ${authToken}` } : undefined
    );

  return graphqlErrorWrapper(callback, userRole);
};

// --- REST / ICS Download Helper ---

export const downloadIcsFile = async (
  eventId: string,
  userRole?: TestUser
): Promise<{
  status: number;
  headers: Record<string, string>;
  body: string;
  redirectUrl?: string;
}> => {
  const baseUrl = testConfiguration.endPoints.rest;
  const url = `${baseUrl}/calendar/event/${eventId}/ics`;

  let authToken: string | undefined;
  if (userRole) {
    const userModel = TestUserManager.getUserModelByType(userRole);
    authToken = userModel.authToken;
  }

  const headers: Record<string, string> = {};
  if (authToken) {
    headers['authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
    redirect: 'manual',
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const body = response.status === 200 ? await response.text() : '';

  return {
    status: response.status,
    headers: responseHeaders,
    body,
    redirectUrl: responseHeaders['location'],
  };
};
