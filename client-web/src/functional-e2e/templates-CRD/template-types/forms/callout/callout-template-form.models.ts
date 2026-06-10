/**
 * Collaboration Tool (Callout) Template Form Models
 *
 * These interfaces define the data structures for Callout Templates,
 * which have the most complex form structure among template types.
 */

import { randomBytes } from 'crypto';
import { TemplateForm } from '../template-form.models';

// ============================================================================
// Framing Types
// ============================================================================

export type CalloutTemplateFramingType =
  | 'none'
  | 'whiteboard'
  | 'memo'
  | 'callToAction'
  | 'poll';

export interface CalloutTemplateFramingNone {
  type: 'none';
}

export interface CalloutTemplateFramingWhiteboard {
  type: 'whiteboard';
  textInWhiteboard: string;
}

export interface CalloutTemplateFramingMemo {
  type: 'memo';
  memoContent: string;
}

export interface CalloutTemplateFramingCallToAction {
  type: 'callToAction';
  ctaText: string;
  ctaUrl: string;
}

/**
 * Poll framing. The four `settings` flags mirror the in-form "Poll Settings"
 * sub-dialog toggles (live UI as of 2026-05-19):
 *  - allowMultipleResponses        — voters may pick more than one option
 *  - allowContributorsToAddOptions — voters can append their own options
 *  - hideResultsUntilUserVotes     — tally hidden until the viewer has voted
 *  - showVoterAvatars              — voters are identifiable (false = anonymous)
 *
 * UI defaults (when the Poll radio is just selected, before opening Settings):
 *   allowMultipleResponses=false, allowContributorsToAddOptions=false,
 *   hideResultsUntilUserVotes=false, showVoterAvatars=true.
 */
export interface CalloutTemplateFramingPoll {
  type: 'poll';
  question: string;
  options: string[];
  settings: {
    allowMultipleResponses: boolean;
    allowContributorsToAddOptions: boolean;
    hideResultsUntilUserVotes: boolean;
    showVoterAvatars: boolean;
  };
}

export type CalloutTemplateFraming =
  | CalloutTemplateFramingNone
  | CalloutTemplateFramingWhiteboard
  | CalloutTemplateFramingMemo
  | CalloutTemplateFramingCallToAction
  | CalloutTemplateFramingPoll;

// ============================================================================
// Response Types
// ============================================================================

export type CalloutTemplateResponseType = 'none' | 'linksFiles' | 'posts' | 'memos' | 'whiteboards';

export interface CalloutTemplateResponseSettingsBase {
  membersCanAdd: boolean;
  adminsCanAdd: boolean;
}

export interface CalloutTemplateResponseNone {
  type: 'none';
}

export interface CalloutTemplateResponseLinksFiles extends CalloutTemplateResponseSettingsBase {
  type: 'linksFiles';
}

export interface CalloutTemplateResponsePosts extends CalloutTemplateResponseSettingsBase {
  type: 'posts';
  defaultTitle: string;
  defaultDescription: string;
  enableCommentsOnPosts: boolean;
}

export interface CalloutTemplateResponseMemos extends CalloutTemplateResponseSettingsBase {
  type: 'memos';
  defaultTitle: string;
  defaultDescription: string;
}

export interface CalloutTemplateResponseWhiteboards extends CalloutTemplateResponseSettingsBase {
  type: 'whiteboards';
  defaultTitle: string;
  textInWhiteboard: string;
}

export type CalloutTemplateResponseCollection =
  | CalloutTemplateResponseNone
  | CalloutTemplateResponseLinksFiles
  | CalloutTemplateResponsePosts
  | CalloutTemplateResponseMemos
  | CalloutTemplateResponseWhiteboards;

// ============================================================================
// Main Callout Template Form Interface
// ============================================================================

/**
 * Callout Template Form extends the base TemplateForm with callout-specific fields.
 *
 * Form structure:
 * 1. Template metadata (displayName, description, tags) - inherited from TemplateForm
 * 2. Callout base fields (title, calloutTags, calloutDescription)
 * 3. Additional content (none, whiteboard, memo, callToAction)
 * 4. Response options (commentsEnabled, collection)
 */
export interface CalloutTemplateForm extends TemplateForm {
  testId: string;
  // Callout base fields
  calloutTitle: string;
  calloutTags: string[];
  calloutDescription: string;
  calloutReferences: { title: string; url: string }[];

  // Additional content
  framing: CalloutTemplateFraming;

  // Response:
  commentsEnabled: boolean;
  responseOptions: CalloutTemplateResponseCollection;
}

export const createCalloutTemplateData = ({
  testNumber,
  framingType,
  commentsEnabled,
  responseType,
  contributionsEnabledAdmin = true,
  contributionsEnabledMember = contributionsEnabledAdmin, // if not set, default to same as admin
  commentsOnContributionsEnabled,
  calloutReferences = [],
  pollOptionCount = 3,
  pollMultiVote = false,
  pollAllowAddOptions = false,
  pollHideResults = false,
  pollShowVoters = true,
}: {
    testNumber: string,
    framingType: CalloutTemplateFramingType,
    commentsEnabled: boolean,
    responseType: CalloutTemplateResponseType,
    contributionsEnabledAdmin?: boolean,
    contributionsEnabledMember?: boolean,
    commentsOnContributionsEnabled?: boolean,
    calloutReferences?: { title: string; url: string }[],
    // Poll-specific args (only meaningful when framingType === 'poll').
    pollOptionCount?: number,
    pollMultiVote?: boolean,
    pollAllowAddOptions?: boolean,
    pollHideResults?: boolean,
    pollShowVoters?: boolean,
}): CalloutTemplateForm => {
  const hexId = randomBytes(3).toString('hex');

  let framing: CalloutTemplateFraming = { type: 'none' };
  switch (framingType) {
    case 'whiteboard':
      framing = { type: 'whiteboard', textInWhiteboard: `Whiteboard content in Callout Template - ID: ${hexId}` };
      break;
    case 'memo':
      framing = { type: 'memo', memoContent: `Memo content in Callout Template - ID: ${hexId}` };
      break;
    case 'callToAction':
      framing = { type: 'callToAction', ctaText: `Click Here - ID: ${hexId}`, ctaUrl: 'https://alkem.io' };
      break;
    case 'poll':
      framing = {
        type: 'poll',
        question: `Poll Question ${hexId}?`,
        options: Array.from(
          { length: Math.max(2, pollOptionCount) },
          (_, i) => `Option ${i + 1} - ${hexId}`
        ),
        settings: {
          allowMultipleResponses: pollMultiVote,
          allowContributorsToAddOptions: pollAllowAddOptions,
          hideResultsUntilUserVotes: pollHideResults,
          showVoterAvatars: pollShowVoters,
        },
      };
      break;
    case 'none':
    default:
  }

  let responseOptions: CalloutTemplateResponseCollection = { type: 'none' };
  switch (responseType) {
    case 'linksFiles':
      responseOptions = {
        type: 'linksFiles',
        membersCanAdd: contributionsEnabledMember,
        adminsCanAdd: contributionsEnabledAdmin,
      };
      break;
    case 'whiteboards':
      responseOptions = {
        type: 'whiteboards',
        defaultTitle: `Default WB Tit ${hexId}`,
        textInWhiteboard: `Default WB Content in wbTemplate ${hexId}`,
        membersCanAdd: contributionsEnabledMember,
        adminsCanAdd: contributionsEnabledAdmin,
      };
      break;
    case 'memos':
      responseOptions = {
        type: 'memos',
        defaultDescription: `Default Memo Desc ${hexId}`,
        defaultTitle: `Default Memo Tit ${hexId}`,
        membersCanAdd: contributionsEnabledMember,
        adminsCanAdd: contributionsEnabledAdmin,
      };
      break;
    case 'posts':
      responseOptions = {
        type: 'posts',
        defaultDescription: `Default Post Desc ${hexId}`,
        defaultTitle: `Default Post Tit ${hexId}`,
        enableCommentsOnPosts: commentsOnContributionsEnabled ?? true,
        membersCanAdd: contributionsEnabledMember,
        adminsCanAdd: contributionsEnabledAdmin,
      };
      break;
    case 'none':
    default:
  }

  const pollDescription = framingType === 'poll' ?
  ` poll:${pollMultiVote ? 'Multivote ' : 'Singlevote '}
        ${pollAllowAddOptions ? 'AddOptionsAllowed ' : 'NoAddOptions '}
        ${pollHideResults ? 'HideResults ' : 'ViewResults '}
        ${pollShowVoters ? 'ShowVoters' : 'HideVoters'}` : '';

  const pollDescriptionShort = framingType === 'poll' ?
    ` poll:${pollMultiVote ? 'M' : 'S'}${pollAllowAddOptions ? 'A' : 'N'}${pollHideResults ? 'H' : 'V'}${pollShowVoters ? 'V' : 'A'}` :
    '';

  const calloutDescription = `
  Test: ${testNumber}
  Callout Template Description
  - ID: ${hexId}
  - AC: ${framingType}
  - Comments: ${commentsEnabled ? 'Enabled' : 'Disabled'}
  - Response: ${responseType}` + (responseType !== 'none' ? `
  - Admins can contribute: ${contributionsEnabledAdmin}
  - Members can contribute: ${contributionsEnabledMember}
  - Comments on contributions: ${commentsOnContributionsEnabled}
  ${pollDescription}
  ` : '');


  return {
    testId: hexId,
    // Template metadata
    displayName: `${testNumber}. CTtit ${hexId} F:${framingType}, R:${responseType}, Com:${commentsEnabled ? 'On' : 'Off'}${pollDescriptionShort}`,
    description: calloutDescription,
    tags: [hexId, 'callout', 'template', framingType, responseType, commentsEnabled ? 'comm-on' : 'comm-off'],

    // Callout base fields
    calloutTitle: `CTit ${hexId} F:${framingType}, R:${responseType}, Com:${commentsEnabled ? 'On' : 'Off'}`,
    calloutTags: [hexId, 'callout', 'tags', framingType, responseType, commentsEnabled ? 'comm-on' : 'comm-off'],
    calloutDescription: `Callout Description ${calloutDescription}`,
    calloutReferences,

    // Additional content: None
    framing: framing,

    // Response options
    commentsEnabled,
    responseOptions,
  };
};
