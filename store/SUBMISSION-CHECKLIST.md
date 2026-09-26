# Have Fun Learning — release handoff

This is a handoff, not a claim that the app has been submitted. The app runs on
iOS and Android; do not upload one platform without checking the other.

## Ready in the repositories

- App-specific privacy, terms, and support pages are implemented in the
  `hashfront-consulting` website at `/math-edu/privacy`, `/math-edu/terms`, and
  `/math-edu/support`. Settings links to privacy and terms on both platforms.
- The release build hides the online tutor unless `EXPO_PUBLIC_TUTOR_URL` is
  explicitly set. The current production tutor endpoint returns 503.
- App Store copy, privacy notes, review notes, screenshot files, and tip
  product IDs are under `store/`. Production EAS settings are in
  `frontend/eas.json`.

## Must be completed before submitting

1. Publish the website changes to `hashfront.com`. A 200 response is not
   enough for this single-page site: open each URL in a browser and confirm
   it renders the correct new page, not the site's 404 page. Review the legal
   wording with the publisher or counsel, especially children's data,
   retention and deletion requests, and store terms.
2. Enter `https://hashfront.com/math-edu/privacy` as the App Store Privacy
   Policy URL and Google Play privacy-policy URL. Enter
   `https://hashfront.com/math-edu/support` as the App Store Support URL.
   Apple's standard EULA can remain in place; the terms page is not a custom
   EULA submission by itself.
3. Complete App Store Connect App Privacy and Google Play Data safety from the
   actual release binary. Include Android backup of player names and progress,
   feedback text/identifiers/network address, and consented first-party usage
   events. Do not claim “no data collected.” Resolve the Kids Category,
   target-age, parental-consent, and age-rating decisions with the publisher.
4. Configure and approve the four consumable tip products in both stores
   (`store/TIPS.md`). Finish Apple Paid Apps agreements/tax/banking and the
   Google payments profile. Test purchases and cancellation with sandbox or
   internal-test accounts on real devices before review.
5. Enable iCloud key-value storage for `com.hashfront.mathedu` on the Apple
   App ID, then verify cross-device progress on signed-in devices. Check
   Android backup, offline five-level exhaustion, notifications, microphone
   refusal, and Settings legal links on a physical device.
6. Inspect and, if necessary, recapture current iPhone and iPad screenshots.
   The existing files show only the home screen. Supply screenshots that
   match the release binary and the store's required device sizes, and check
   the icon at home-screen size.
7. Build signed release artifacts with `frontend/eas.json`, check the final
   app IDs and version/build numbers, then upload through the store accounts.
   Paste the final text from `store/appstore/LISTING.md` and the factual
   review notes from `store/appstore/REVIEW-NOTES.md` after rechecking them.

No store products, account agreements, signed upload, legal approval, or live
website deployment is performed by this repository change.
