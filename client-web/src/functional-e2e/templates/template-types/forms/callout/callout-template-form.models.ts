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
// Collection Types
// ============================================================================

export type CollectionType = 'none' | 'linksFiles' | 'posts' | 'memos' | 'whiteboards';

export interface CollectionSettingsBase {
  membersCanAdd: boolean;
  adminsCanAdd: boolean;
}

export interface CollectionNone {
  type: 'none';
}

export interface CollectionLinksFiles extends CollectionSettingsBase {
  type: 'linksFiles';
}

export interface CollectionPosts extends CollectionSettingsBase {
  type: 'posts';
  defaultTitle: string;
  defaultDescription: string;
  enableCommentsOnPosts: boolean;
}

export interface CollectionMemos extends CollectionSettingsBase {
  type: 'memos';
  defaultTitle: string;
  defaultDescription: string;
}

export interface CollectionWhiteboards extends CollectionSettingsBase {
  type: 'whiteboards';
  defaultTitle: string;
  textInWhiteboard: string;
}

export type Collection =
  | CollectionNone
  | CollectionLinksFiles
  | CollectionPosts
  | CollectionMemos
  | CollectionWhiteboards;

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

  // Additional content (mutually exclusive)
  additionalContent: AdditionalContent;

  // Response options
  commentsEnabled: boolean;
  collection: Collection;
}

// ============================================================================
// Factory Functions for Creating Default Form Data
// ============================================================================

export const createDefaultCalloutTemplateForm = (
  overrides: Partial<CalloutTemplateForm> = {}
): CalloutTemplateForm => ({
  displayName: '',
  description: '',
  tags: [],
  calloutTitle: '',
  calloutTags: [],
  calloutDescription: '',
  additionalContent: { type: 'none' },
  commentsEnabled: false,
  collection: { type: 'none' },
  ...overrides,
});

export const createAdditionalContentNone = (): AdditionalContentNone => ({
  type: 'none',
});

export const createAdditionalContentWhiteboard = (
  textInWhiteboard: string
): AdditionalContentWhiteboard => ({
  type: 'whiteboard',
  textInWhiteboard,
});

export const createAdditionalContentMemo = (
  memoContent: string
): AdditionalContentMemo => ({
  type: 'memo',
  memoContent,
});

export const createAdditionalContentCallToAction = (
  ctaText: string,
  ctaUrl: string
): AdditionalContentCallToAction => ({
  type: 'callToAction',
  ctaText,
  ctaUrl,
});

export const createCollectionNone = (): CollectionNone => ({
  type: 'none',
});

export const createCollectionLinksFiles = (
  settings: Partial<Omit<CollectionLinksFiles, 'type'>> = {}
): CollectionLinksFiles => ({
  type: 'linksFiles',
  membersCanAdd: true,
  adminsCanAdd: true,
  ...settings,
});

export const createCollectionPosts = (
  settings: Partial<Omit<CollectionPosts, 'type'>> = {}
): CollectionPosts => ({
  type: 'posts',
  defaultTitle: '',
  defaultDescription: '',
  membersCanAdd: true,
  adminsCanAdd: true,
  enableCommentsOnPosts: true,
  ...settings,
});

export const createCollectionMemos = (
  settings: Partial<Omit<CollectionMemos, 'type'>> = {}
): CollectionMemos => ({
  type: 'memos',
  defaultTitle: '',
  defaultDescription: '',
  membersCanAdd: true,
  adminsCanAdd: true,
  ...settings,
});

export const createCollectionWhiteboards = (
  settings: Partial<Omit<CollectionWhiteboards, 'type'>> = {}
): CollectionWhiteboards => ({
  type: 'whiteboards',
  defaultTitle: '',
  textInWhiteboard: '',
  membersCanAdd: true,
  adminsCanAdd: true,
  ...settings,
});
