import { StoryQuestion } from '../../types';

/**
 * One story before it is given its place on the map.
 *
 * The map's numbering comes from position alone, so a pack is only ever
 * appended to — progress is stored against the story id, which means a story
 * can be retitled but never renumbered or reordered.
 */
export interface StorySpec {
  title: string;
  icon: string;
  text: string;
  questions: StoryQuestion[];
}
