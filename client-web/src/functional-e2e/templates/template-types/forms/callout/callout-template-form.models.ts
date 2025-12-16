/**
 * Collaboration Tool (Callout) Template Form Models
 *
 * These interfaces define the data structures for Callout Templates,
 * which have the most complex form structure among template types.
 */

import { TemplateForm } from '../template-form.models';

// ============================================================================
// Framing Types
// ============================================================================

export type CalloutTemplateFramingType = 'none' | 'whiteboard' | 'memo' | 'callToAction';

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

export type CalloutTemplateFraming =
  | CalloutTemplateFramingNone
  | CalloutTemplateFramingWhiteboard
  | CalloutTemplateFramingMemo
  | CalloutTemplateFramingCallToAction;

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
  framingType,
  commentsEnabled,
  responseType,
}: {
    framingType: CalloutTemplateFramingType,
    commentsEnabled: boolean,
    responseType: CalloutTemplateResponseType,
}): CalloutTemplateForm => {
  let framing: CalloutTemplateFraming = { type: 'none' };
  switch (framingType) {
    case 'whiteboard':
      framing = { type: 'whiteboard', textInWhiteboard: 'Whiteboard content in Callout Template' };
      break;
    case 'memo':
      framing = { type: 'memo', memoContent: 'Memo content in Callout Template' };
      break;
    case 'callToAction':
      framing = { type: 'callToAction', ctaText: 'Click Here', ctaUrl: 'https://alkem.io' };
      break;
    case 'none':
    default:
  }

  let responseOptions: CalloutTemplateResponseCollection = { type: 'none' };
  switch (responseType) {
    case 'linksFiles':
      responseOptions = {
        type: 'linksFiles',
        membersCanAdd: true,
        adminsCanAdd: true,
      };
      break;
    case 'whiteboards':
      responseOptions = {
        type: 'whiteboards',
        defaultTitle: 'Default Whiteboard Title',
        textInWhiteboard: 'Default Whiteboard Content in whiteboard template',
        membersCanAdd: true,
        adminsCanAdd: true,
      };
      break;
    case 'memos':
      responseOptions = {
        type: 'memos',
        defaultDescription: 'Default Memo Description',
        defaultTitle: 'Default Memo Title',
        membersCanAdd: true,
        adminsCanAdd: true,
      };
      break;
    case 'posts':
      responseOptions = {
        type: 'posts',
        defaultDescription: 'Default Post Description',
        defaultTitle: 'Default Post Title',
        enableCommentsOnPosts: true,
        membersCanAdd: true,
        adminsCanAdd: true,
      };
      break;
    case 'none':
    default:
  }


  return {
    // Template metadata
    displayName: `CTtit - AC:${framingType}, Response:${responseType}, Com:${commentsEnabled ? 'On' : 'Off'}`,
    description:
      `Callout Template Description - AC:${framingType}, Response:${responseType}, Com:${commentsEnabled ? 'On' : 'Off'}`,
    tags: ['callout', 'template', framingType, responseType, commentsEnabled ? 'comments-enabled' : 'comments-disabled'],

    // Callout base fields
    calloutTitle: `CTit - AC:${framingType}, Resp:${responseType}, Com:${commentsEnabled ? 'On' : 'Off'}`,
    calloutTags: ['callout', 'tags', framingType, responseType, commentsEnabled ? 'comments-enabled' : 'comments-disabled'],
    calloutDescription: `Callout Template Callout Description - AC:${framingType}, Response:${responseType}, Com:${commentsEnabled ? 'On' : 'Off'}`,
    calloutReferences: [],

    // Additional content: None
    framing: framing,

    // Response options
    commentsEnabled,
    responseOptions,
  };
};
