/**
 * Collaboration Tool (Callout) Template Form Models
 *
 * These interfaces define the data structures for Callout Templates,
 * which have the most complex form structure among template types.
 */

import { TemplateForm } from '../template-form.models';

// ============================================================================
// Additional Content Types
// ============================================================================

export type AdditionalContentType = 'none' | 'whiteboard' | 'memo' | 'callToAction';

export interface AdditionalContentNone {
  type: 'none';
}

export interface AdditionalContentWhiteboard {
  type: 'whiteboard';
  textInWhiteboard: string;
}

export interface AdditionalContentMemo {
  type: 'memo';
  memoContent: string;
}

export interface AdditionalContentCallToAction {
  type: 'callToAction';
  ctaText: string;
  ctaUrl: string;
}

export type AdditionalContent =
  | AdditionalContentNone
  | AdditionalContentWhiteboard
  | AdditionalContentMemo
  | AdditionalContentCallToAction;

// ============================================================================
// Response Types
// ============================================================================

export type ResponseType = 'none' | 'linksFiles' | 'posts' | 'memos' | 'whiteboards';

export interface ResponseSettingsBase {
  membersCanAdd: boolean;
  adminsCanAdd: boolean;
}

export interface ResponseNone {
  type: 'none';
}

export interface ResponseLinksFiles extends ResponseSettingsBase {
  type: 'linksFiles';
}

export interface ResponsePosts extends ResponseSettingsBase {
  type: 'posts';
  defaultTitle: string;
  defaultDescription: string;
  enableCommentsOnPosts: boolean;
}

export interface ResponseMemos extends ResponseSettingsBase {
  type: 'memos';
  defaultTitle: string;
  defaultDescription: string;
}

export interface ResponseWhiteboards extends ResponseSettingsBase {
  type: 'whiteboards';
  defaultTitle: string;
  textInWhiteboard: string;
}

export type ResponseCollection =
  | ResponseNone
  | ResponseLinksFiles
  | ResponsePosts
  | ResponseMemos
  | ResponseWhiteboards;

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

  // Additional content (mutually exclusive)
  additionalContent: AdditionalContent;

  // Response options
  commentsEnabled: boolean;
  responseOptions: ResponseCollection;
}

export const createCalloutTemplateData = ({
  additionalContentType,
  commentsEnabled,
  responseType,
}: {
  additionalContentType: AdditionalContentType,
  commentsEnabled: boolean,
  responseType: ResponseType,
}): CalloutTemplateForm => {
  let additionalContent: AdditionalContent = { type: 'none' };
  switch (additionalContentType) {
    case 'whiteboard':
      additionalContent = { type: 'whiteboard', textInWhiteboard: 'Whiteboard content in Callout Template' };
      break;
    case 'memo':
      additionalContent = { type: 'memo', memoContent: 'Memo content in Callout Template' };
      break;
    case 'callToAction':
      additionalContent = { type: 'callToAction', ctaText: 'Click Here', ctaUrl: 'https://alkem.io' };
      break;
    case 'none':
    default:
  }

  let responseOptions: ResponseCollection = { type: 'none' };
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
    displayName: `CT Title - AC:${additionalContentType}, Response:${responseType}, Com:${commentsEnabled ? 'On' : 'Off'}`,
    description:
      `Callout Template Description - AC:${additionalContentType}, Response:${responseType}, Com:${commentsEnabled ? 'On' : 'Off'}`,
    tags: ['callout', 'template', additionalContentType, responseType, commentsEnabled ? 'comments-enabled' : 'comments-disabled'],

    // Callout base fields
    calloutTitle: 'Callout Template - Callout Title',
    calloutTags: ['callout', 'tags', additionalContentType, responseType, commentsEnabled ? 'comments-enabled' : 'comments-disabled'],
    calloutDescription: `Callout Template Callout Description - AC:${additionalContentType}, Response:${responseType}, Com:${commentsEnabled ? 'On' : 'Off'}`,
    calloutReferences: [],

    // Additional content: None
    additionalContent,

    // Response options
    commentsEnabled,
    responseOptions,
  };
};
