import AsyncStorage from '@react-native-async-storage/async-storage';

import { loadGrades, saveGrades } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

beforeEach(async () => {
  await AsyncStorage.clear();
});

/**
 * The grade is the one setting a child cannot discover is wrong on their own:
 * a grade-4 map full of grade-1 sums just looks like an easy day.
 */
describe('grades', () => {
  it('starts every subject at grade 1', async () => {
    expect(await loadGrades()).toEqual({ math: 1, reading: 1, logic: 1 });
  });

  it('remembers each subject separately', async () => {
    await saveGrades({ math: 3, reading: 5, logic: 2 });
    expect(await loadGrades()).toEqual({ math: 3, reading: 5, logic: 2 });
  });

  it('survives a restart, which is the whole point of saving it', async () => {
    await saveGrades({ math: 4, reading: 4, logic: 4 });
    // A second load with nothing else in between is what a relaunch does.
    expect(await loadGrades()).toEqual({ math: 4, reading: 4, logic: 4 });
  });

  it('falls back to grade 1 for anything stored that is not a grade', async () => {
    await AsyncStorage.setItem(
      'mathquiz:grades',
      JSON.stringify({ math: 9, reading: 'three', logic: 2 }),
    );
    expect(await loadGrades()).toEqual({ math: 1, reading: 1, logic: 2 });
  });

  it('falls back cleanly when the stored value is not JSON at all', async () => {
    await AsyncStorage.setItem('mathquiz:grades', 'not json');
    expect(await loadGrades()).toEqual({ math: 1, reading: 1, logic: 1 });
  });

  it('fills in a subject that was never saved', async () => {
    // What an upgrade from a build that only knew about two subjects leaves.
    await AsyncStorage.setItem('mathquiz:grades', JSON.stringify({ math: 3 }));
    expect(await loadGrades()).toEqual({ math: 3, reading: 1, logic: 1 });
  });
});
