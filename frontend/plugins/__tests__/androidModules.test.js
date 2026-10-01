const fs = require('node:fs');
const path = require('node:path');

it('applies the Expo compiler plugin to every local Android module', () => {
  for (const name of ['app-lock', 'daily-reminder']) {
    const gradle = fs.readFileSync(
      path.resolve(__dirname, `../../modules/${name}/android/build.gradle`),
      'utf8',
    );
    expect(gradle).toContain("apply plugin: 'expo-module-gradle-plugin'");
  }
});
