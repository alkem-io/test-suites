import { isAbsolute } from 'node:path';
import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import {
  loadAcceptanceFixture,
  type AcceptanceFixture,
} from './attachments.acceptance';
import type { AttachmentRoom } from './attachments.helpers';

export type HistoricalMedia = {
  mediaID: string;
  mxc: string;
  eventID: string;
  stagingFileID: string;
  originalFileID: string;
  originalURL: string;
  displayName: string;
};
export type HistoryFixture = AcceptanceFixture & {
  history: {
    baselineRevision: string;
    web: HistoricalMedia;
    repeatedWeb: HistoricalMedia;
    excluded: HistoricalMedia;
    element: HistoricalMedia;
    untouchedMediaIDs: string[];
    ordinaryDraftID: string;
  };
};
export type NormalizationCounts = {
  scanned: number;
  eligible: number;
  copied: number;
  moved: number;
  reused: number;
  reconciled: number;
  redundantStageRemoved: number;
  skipped: number;
  failed: number;
};
export type OperatorResult = {
  path: string;
  ok: boolean;
  counts: NormalizationCounts;
};

/** Private fixture command wiring, not an alternative placement/normalization implementation. */
export type HistoryFixtureDriver = {
  isolated: true;
  runID: string;
  supportedRooms(): Promise<string[]>;
  exportInventory(roomIDs: string[], label: string): Promise<string>;
  dryRun(eventsPath: string, label: string): Promise<OperatorResult>;
  apply(planPath: string, label: string): Promise<OperatorResult>;
  deleteDocument(fileID: string): Promise<void>;
  approveTargets(
    planPath: string,
    targets: { bucketId: string; mediaId: string }[],
    label: string
  ): Promise<string>;
  activateReader(): Promise<void>;
  activationEvidence(): Promise<{
    sourceCompatible: boolean;
    mediaVolumeBefore: string;
    mediaVolumeAfter: string;
    providerModuleSHA256: string;
    runningProviderModuleSHA256: string;
  }>;
  quarantineOriginal(mediaID: string): Promise<{
    originalAbsent(): Promise<boolean>;
    // Actual private forwarding observation for just this media lookup/content;
    // never fabricated from a successful cached response.
    providerFetches(): Promise<{ lookups: number; contentReads: number }>;
    restore(): Promise<void>;
  }>;
};

export async function loadHistoryFixture(): Promise<HistoryFixture> {
  const fixture = (await loadAcceptanceFixture()) as HistoryFixture;
  const h = fixture.history;
  if (!h || !/^[0-9a-f]{40}$/.test(h.baselineRevision))
    throw new Error(
      'Historical acceptance requires genuine pre-change fixture evidence'
    );
  for (const media of [h.web, h.repeatedWeb, h.excluded, h.element]) {
    if (
      !media ||
      !/^[a-zA-Z0-9_-]{1,256}$/.test(media.mediaID) ||
      !media.mxc.endsWith(`/${media.mediaID}`) ||
      !media.eventID ||
      !/^[0-9a-f-]{36}$/i.test(media.originalFileID) ||
      !/^[0-9a-f-]{36}$/i.test(media.stagingFileID) ||
      !media.originalURL.startsWith(fixture.baseURL + '/')
    )
      throw new Error('Historical fixture has incomplete event/file evidence');
  }
  return fixture;
}

export async function loadHistoryDriver(
  fixture: AcceptanceFixture
): Promise<HistoryFixtureDriver> {
  const path = process.env.ATTACHMENTS_HISTORY_DRIVER;
  if (!path || !isAbsolute(path) || ((await stat(path)).mode & 0o077) !== 0)
    throw new Error(
      'Historical acceptance requires an explicit private isolated-fixture driver'
    );
  const driver = (await import(pathToFileURL(path).href))
    .default as HistoryFixtureDriver;
  if (driver?.isolated !== true || driver.runID !== fixture.runID)
    throw new Error('Historical driver fixture mismatch');
  return driver;
}

export async function roomAttachment(
  actor: {
    graphql<T>(query: string, variables: Record<string, unknown>): Promise<T>;
  },
  room: AttachmentRoom,
  eventID: string
) {
  const result = await actor.graphql<{
    lookup: {
      room: {
        messages: {
          id: string;
          attachments: {
            externalReference: string;
            displayName: string;
          }[];
        }[];
      };
    };
  }>(
    'query HistoricalMessage($id:UUID!){lookup{room(ID:$id){messages{id attachments{externalReference displayName}}}}}',
    { id: room.roomID }
  );
  return result.lookup.room.messages.find(message => message.id === eventID)
    ?.attachments[0];
}
