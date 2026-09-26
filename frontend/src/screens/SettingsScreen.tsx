import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeedbackSheet from '../components/FeedbackSheet';
import { ContentStatus, UpdateOutcome, checkNow, contentStatus } from '../content';
import { appLockSupported } from '../../modules/app-lock';
import { cancelDailyReminder, scheduleDailyReminder } from '../../modules/daily-reminder';
import { iCloudAvailable } from '../../modules/icloud-store';
import { FeedbackDraft, feedbackAvailable } from '../lib/feedback';
import { askGrownUp, gateAvailable } from '../lib/parentGate';
import { Identity, loadIdentity } from '../lib/identity';
import { SyncMeta, backupAvailable, loadSyncMeta, pushNow } from '../lib/sync';
import { loadUsageConsent, setUsageConsent } from '../lib/usage';
import { newTipChallenge, TIP_PRODUCTS, useTips } from '../lib/tips';
import { ProfileStore, canAddProfile } from '../lib/profiles';
import { colors } from '../theme';
import { Grade, Settings, Subject } from '../types';

interface Props {
  /** Who is on this tablet, and what a grown-up may do about it. */
  profiles: ProfileStore;
  onAddProfile: (name: string) => void;
  onRenameProfile: (id: string, name: string) => void;
  onRemoveProfile: (id: string) => void;
  settings: Settings;
  onChange: (settings: Settings) => void;
  /** One grade per subject, so reading and arithmetic can differ. */
  grades: Record<Subject, Grade>;
  onGradeChange: (subject: Subject, grade: Grade) => void;
  onBack: () => void;
}

const GRADES: Grade[] = [1, 2, 3, 4, 5];
const LEGAL_BASE_URL = 'https://hashfront.com/math-edu';

const reminderTime = (hour: number, minute: number): string => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const twelve = hour % 12 || 12;
  return `${twelve}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const shiftedReminder = (hour: number, minute: number, delta: number) => {
  const total = (hour * 60 + minute + delta + 24 * 60) % (24 * 60);
  return { hour: Math.floor(total / 60), minute: total % 60 };
};

/** The subjects in the order the tab bar shows them. */
const SUBJECT_ROWS: { subject: Subject; label: string; icon: string }[] = [
  { subject: 'math', label: 'Maths', icon: '🧮' },
  { subject: 'reading', label: 'Reading', icon: '📖' },
  { subject: 'logic', label: 'Logic', icon: '🧩' },
];

interface RowProps {
  label: string;
  detail: string;
  value: boolean;
  disabled?: boolean;
  onValueChange: (value: boolean) => void;
}

/** One switch and the sentence that says what it does. */
function Row({ label, detail, value, disabled, onValueChange }: RowProps) {
  return (
    <View style={[styles.row, disabled && styles.rowOff]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Switch
        value={value}
        disabled={disabled}
        accessibilityLabel={label}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
      />
    </View>
  );
}

/** "2 minutes ago", for a timestamp a grown-up has to judge freshness from. */
function ago(iso: string | null): string {
  if (!iso) return 'never';
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 'never';

  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

/** What a check produced, in words rather than a status code. */
function outcomeMessage(outcome: UpdateOutcome): string {
  switch (outcome.status) {
    case 'staged':
      return `New content downloaded. Close and reopen the app to start using it.`;
    case 'unchanged':
      return 'Already up to date.';
    case 'disabled':
      return 'No content server is set for this build.';
    case 'throttled':
      return 'Checked very recently — try again in a moment.';
    case 'failed':
      return `Could not reach the content server. ${outcome.reason}`;
  }
}

/**
 * One subject's grade.
 *
 * Each subject gets its own row rather than one grade for the app, because a
 * child who reads a year ahead of their arithmetic would otherwise have to
 * pick which of the two to get wrong.
 */
function GradeRow({
  label,
  icon,
  grade,
  onPick,
}: {
  label: string;
  icon: string;
  grade: Grade;
  onPick: (grade: Grade) => void;
}) {
  return (
    <View style={styles.gradeRow}>
      <Text style={styles.gradeLabel}>
        {icon} {label}
      </Text>
      <View style={styles.gradePills}>
        {GRADES.map((g) => (
          <Pressable
            key={g}
            style={[styles.gradePill, grade === g && styles.gradePillOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: grade === g }}
            accessibilityLabel={`${label} grade ${g}`}
            onPress={() => onPick(g)}
          >
            <Text style={[styles.gradePillText, grade === g && styles.gradePillTextOn]}>
              {g}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** One line of read-only fact about the content. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

/**
 * The one page meant for a grown-up rather than a child: what the quiz
 * offers, rather than anything about how well it is going. Switches save
 * immediately; a typed player name saves when Done or Save is pressed.
 */
export default function SettingsScreen({
  profiles,
  onAddProfile,
  onRenameProfile,
  onRemoveProfile,
  settings,
  onChange,
  grades,
  onGradeChange,
  onBack,
}: Props) {
  const [status, setStatus] = useState<ContentStatus>(contentStatus);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [syncMeta, setSyncMeta] = useState<SyncMeta | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [syncing, setSyncing] = useState(false);
  /** Names being typed, so a half-typed name is not saved on every keystroke. */
  const [draft, setDraft] = useState<Record<string, string>>({});
  const saveDraftName = (id: string, currentName: string) => {
    const name = draft[id]?.trim();
    if (!name || name === currentName) return;
    onRenameProfile(id, name);
    setDraft((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };
  const [newName, setNewName] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [usageConsent, setUsageConsentState] = useState(false);
  const [legalLinkError, setLegalLinkError] = useState(false);
  const openLegalPage = (page: 'privacy' | 'terms') => {
    setLegalLinkError(false);
    void Linking.openURL(`${LEGAL_BASE_URL}/${page}`).catch(() => setLegalLinkError(true));
  };
  /** Which feedback form is open, if either. */
  const [telling, setTelling] = useState<FeedbackDraft['kind'] | null>(null);
  /** Whether the tablet has a PIN to ask for before unlocking the app. */
  const [gated, setGated] = useState(false);
  const [tipChallenge, setTipChallenge] = useState<ReturnType<typeof newTipChallenge> | null>(null);
  const [tipAnswer, setTipAnswer] = useState('');
  const [tipUnlocked, setTipUnlocked] = useState(false);
  const [tipGateError, setTipGateError] = useState(false);
  const tips = useTips();
  useEffect(() => {
    void gateAvailable().then(setGated);
  }, []);

  // Read from disk on the way in, so opening this page shows what is there
  // now rather than what was there when the app started.
  useEffect(() => setStatus(contentStatus()), []);
  useEffect(() => {
    void loadSyncMeta().then(setSyncMeta);
    void loadIdentity().then(setIdentity);
    void loadUsageConsent().then((allowed) => setUsageConsentState(allowed === true));
  }, []);

  const syncNow = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const ok = await pushNow();
      setSyncMessage(ok ? 'Backed up.' : 'Could not reach the sync server — will retry later.');
    } finally {
      setSyncMeta(await loadSyncMeta());
      setIdentity(await loadIdentity());
      setSyncing(false);
    }
  }, []);

  const check = useCallback(async () => {
    setChecking(true);
    setMessage(null);
    try {
      const outcome = await checkNow();
      setMessage(outcomeMessage(outcome));
    } finally {
      setStatus(contentStatus());
      setChecking(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
        >
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.section}>Players</Text>
        <View style={styles.panel}>
          {profiles.profiles.map((profile) => (
            <View key={profile.id} style={styles.playerRow}>
              <Text style={styles.playerAvatar}>{profile.avatar}</Text>
              <TextInput
                style={styles.playerName}
                value={draft[profile.id] ?? profile.name}
                accessibilityLabel={`Name for ${profile.name}`}
                maxLength={12}
                returnKeyType="done"
                onChangeText={(text) => setDraft((current) => ({ ...current, [profile.id]: text }))}
                onSubmitEditing={() => saveDraftName(profile.id, profile.name)}
              />
              {draft[profile.id] !== undefined && draft[profile.id].trim() !== profile.name && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Save ${profile.name}'s name`}
                  disabled={!draft[profile.id].trim()}
                  onPress={() => saveDraftName(profile.id, profile.name)}
                >
                  <Text style={[styles.addKid, !draft[profile.id].trim() && styles.addKidOff]}>Save</Text>
                </Pressable>
              )}
              {profile.id === profiles.activeId && <Text style={styles.playing}>playing</Text>}
              {/*
                Removing a child throws away everything they earned, so it
                asks — and the last one cannot go at all, or the next launch
                would open on a stranger.
              */}
              {profiles.profiles.length > 1 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${profile.name}`}
                  onPress={() => setConfirming(profile.id)}
                >
                  <Text style={styles.remove}>{confirming === profile.id ? '' : '✕'}</Text>
                </Pressable>
              )}
              {confirming === profile.id && (
                <View style={styles.confirm}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${profile.name} and everything they earned`}
                    onPress={() => {
                      setConfirming(null);
                      onRemoveProfile(profile.id);
                    }}
                  >
                    <Text style={styles.confirmYes}>Delete</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Keep them"
                    onPress={() => setConfirming(null)}
                  >
                    <Text style={styles.confirmNo}>Keep</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))}

          {canAddProfile(profiles) && (
            <View style={styles.playerRow}>
              <Text style={styles.playerAvatar}>＋</Text>
              <TextInput
                style={styles.playerName}
                value={newName}
                placeholder="Add someone"
                accessibilityLabel="Name for a new player"
                maxLength={12}
                onChangeText={setNewName}
                onSubmitEditing={() => {
                  if (newName.trim() === '') return;
                  onAddProfile(newName);
                  setNewName('');
                }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add this player"
                disabled={newName.trim() === ''}
                onPress={() => {
                  if (newName.trim() === '') return;
                  onAddProfile(newName);
                  setNewName('');
                }}
              >
                <Text style={[styles.addKid, newName.trim() === '' && styles.addKidOff]}>Add</Text>
              </Pressable>
            </View>
          )}
        </View>
        <Text style={styles.note}>
          Everyone has their own stars, coins and lessons. Tap the face at the top of a map
          to swap who is playing.
        </Text>

        <Text style={[styles.section, styles.sectionSpaced]}>Grade</Text>
        <View style={styles.panel}>
          {SUBJECT_ROWS.map(({ subject, label, icon }) => (
            <GradeRow
              key={subject}
              label={label}
              icon={icon}
              grade={grades[subject]}
              onPick={(grade) => onGradeChange(subject, grade)}
            />
          ))}
        </View>
        <Text style={styles.note}>
          Each subject has its own grade, so a child who reads ahead of their sums does
          not have to choose. The grade showing is on every map, at the top.
        </Text>

        <Text style={[styles.section, styles.sectionSpaced]}>Scratch paper</Text>
        <Row
          label="Scratch paper"
          detail="A sheet of scrap paper for working an answer out by hand. Out from the start on maths; on logic the pencil fetches it when it is wanted."
          value={settings.scratchPaper}
          onValueChange={(scratchPaper) => onChange({ ...settings, scratchPaper })}
        />
        <Row
          label={Platform.OS === 'ios' ? 'Pencil mode' : 'Stylus mode'}
          detail={settings.penOnly
            ? Platform.OS === 'ios'
              ? 'Only Apple Pencil draws on scratch paper; fingers and palms are ignored.'
              : 'Only a stylus draws on scratch paper; fingers and palms are ignored.'
            : Platform.OS === 'ios'
              ? 'Finger mode: both fingers and Apple Pencil draw on scratch paper.'
              : 'Finger mode: both fingers and a stylus draw on scratch paper.'}
          value={settings.penOnly}
          disabled={!settings.scratchPaper}
          onValueChange={(penOnly) => onChange({ ...settings, penOnly })}
        />
        <Text style={styles.note}>
          Finger mode is the default. Turn on {Platform.OS === 'ios' ? 'Pencil' : 'Stylus'} mode to stop a resting hand from making marks.
        </Text>

        <Text style={[styles.section, styles.sectionSpaced]}>Lock to this app</Text>
        {appLockSupported() ? (
          <>
            <Row
              label="Lock the tablet to Have Fun Learning"
              detail="Home, recent apps and every other app stop working. Android asks you to confirm each time it pins."
              value={settings.kioskMode}
              onValueChange={(kioskMode) => {
                /*
                  Turning it *on* is free; turning it off asks for the PIN.

                  Otherwise the lock guards only the door it stands at: a
                  child already inside the app reaches this switch without
                  ever needing the Back-and-Home gesture the PIN protects.
                */
                if (!kioskMode) {
                  void askGrownUp('Enter your PIN to unlock the tablet').then((result) => {
                    if (result.allowed) onChange({ ...settings, kioskMode: false });
                  });
                  return;
                }
                onChange({ ...settings, kioskMode: true });
              }}
            />
            <Text style={styles.note}>
              {gated
                ? 'To leave, hold the two buttons Android names when it pins the app, or turn this off here. Both ask for the tablet\'s PIN.'
                : 'This tablet has no screen lock, so nothing can be asked for — a child can turn this straight back off. Set a PIN in the tablet\'s own Security settings first, and turn on "ask for PIN before unpinning".'}
            </Text>
          </>
        ) : (
          <Text style={styles.note}>
            This tablet can't be locked to one app from inside the app. On an iPad the same job
            is done by Guided Access, in Settings → Accessibility.
          </Text>
        )}

        <Text style={[styles.section, styles.sectionSpaced]}>Sound</Text>
        <Row
          label="Answer sounds"
          detail="A short chime for a quick right answer, and a quieter note for a wrong one. Nothing else in the app makes a noise."
          value={settings.sounds}
          onValueChange={(sounds) => onChange({ ...settings, sounds })}
        />
        <Text style={styles.note}>
          They play even when the tablet is on silent, so turn them off here rather than
          wondering why the ringer isn't stopping them.
        </Text>

        <Text style={[styles.section, styles.sectionSpaced]}>Daily reminder</Text>
        <Row
          label="Remind me to learn"
          detail="A notification at the time below. Change the time or turn it off whenever you like."
          value={settings.reminderEnabled}
          onValueChange={(reminderEnabled) => {
            setReminderMessage(null);
            if (!reminderEnabled) {
              cancelDailyReminder();
              onChange({ ...settings, reminderEnabled: false });
              return;
            }
            void scheduleDailyReminder(settings.reminderHour, settings.reminderMinute).then(
              (scheduled) => {
                if (scheduled) {
                  onChange({ ...settings, reminderEnabled: true });
                } else {
                  setReminderMessage(
                    'Notifications are off for this app. Allow them in the device Settings to use a reminder.',
                  );
                }
              },
            );
          }}
        />
        <View style={styles.reminderPicker}>
          <Pressable
            style={styles.timeButton}
            accessibilityRole="button"
            accessibilityLabel="Earlier reminder"
            onPress={() => {
              const next = shiftedReminder(settings.reminderHour, settings.reminderMinute, -30);
              if (settings.reminderEnabled) void scheduleDailyReminder(next.hour, next.minute);
              onChange({ ...settings, reminderHour: next.hour, reminderMinute: next.minute });
            }}
          >
            <Text style={styles.timeButtonText}>− 30 min</Text>
          </Pressable>
          <View style={styles.timeReadout}>
            <Text style={styles.timeLabel}>Every day at</Text>
            <Text style={styles.timeValue}>
              {reminderTime(settings.reminderHour, settings.reminderMinute)}
            </Text>
          </View>
          <Pressable
            style={styles.timeButton}
            accessibilityRole="button"
            accessibilityLabel="Later reminder"
            onPress={() => {
              const next = shiftedReminder(settings.reminderHour, settings.reminderMinute, 30);
              if (settings.reminderEnabled) void scheduleDailyReminder(next.hour, next.minute);
              onChange({ ...settings, reminderHour: next.hour, reminderMinute: next.minute });
            }}
          >
            <Text style={styles.timeButtonText}>+ 30 min</Text>
          </Pressable>
        </View>
        {reminderMessage !== null && <Text style={styles.problem}>{reminderMessage}</Text>}
        <Text style={styles.note}>
          The reminder follows local time. Changing time zones keeps it at the same time of day.
        </Text>

        <Text style={[styles.section, styles.sectionSpaced]}>Privacy</Text>
        <Row
          label="Share usage data"
          detail="Send app opens and completed lessons to Hashfront with a random install ID and app/device version. No names, answers or scores. Turning off removes the local tracking ID."
          value={usageConsent}
          onValueChange={(allowed) => {
            void setUsageConsent(allowed)
              .then(() => setUsageConsentState(allowed))
              .catch(() => setUsageConsentState(false));
          }}
        />
        <View style={styles.panel}>
          <Pressable accessibilityRole="link" accessibilityLabel="Privacy Policy" onPress={() => openLegalPage('privacy')}>
            <Text style={styles.legalLink}>Privacy Policy ↗</Text>
          </Pressable>
          <Pressable accessibilityRole="link" accessibilityLabel="Terms of Service" onPress={() => openLegalPage('terms')}>
            <Text style={styles.legalLink}>Terms of Service ↗</Text>
          </Pressable>
          {legalLinkError && <Text style={styles.problem}>Could not open hashfront.com. Please try again later.</Text>}
        </View>

        <Text style={[styles.section, styles.sectionSpaced]}>Content</Text>
        <View style={styles.panel}>
          <Fact
            label="Questions and stories"
            value={
              status.manifestVersion > 0
                ? `version ${status.manifestVersion} · ${status.packs} packs`
                : 'the copy that came with the app'
            }
          />
          <Fact label="Last checked" value={ago(status.checkedAt)} />
          <Fact
            label="Store"
            value={`slot ${status.slot}${status.promotedThisLaunch ? ' · updated on open' : ''}`}
          />
          <Fact
            label="Comes from"
            value={status.source ? status.source.replace(/^https?:\/\//, '') : 'nowhere — this build is offline'}
          />
          {status.error !== null && (
            <Text style={styles.problem}>Could not apply the last update: {status.error}</Text>
          )}
          {status.updateWaiting && (
            <Text style={styles.pending}>
              New content is downloaded and ready. Close and reopen the app to start
              using it.
            </Text>
          )}

          <Pressable
            style={[styles.button, (checking || !status.source) && styles.buttonOff]}
            accessibilityRole="button"
            accessibilityLabel="Check for new content"
            disabled={checking || !status.source}
            onPress={check}
          >
            {checking ? (
              <ActivityIndicator color={colors.card} />
            ) : (
              <Text style={styles.buttonText}>Check now</Text>
            )}
          </Pressable>
          {message !== null && <Text style={styles.message}>{message}</Text>}
        </View>
        <Text style={styles.note}>
          New questions and stories arrive on their own, and start being used the next
          time the app is opened. Nothing here is needed for the app to work — it will
          keep going on what it already has.
        </Text>

        <Text style={[styles.section, styles.sectionSpaced]}>Backup &amp; sync</Text>
        <View style={styles.panel}>
          {!backupAvailable() ? (
            <Fact label="Backup" value="off — unavailable on this device" />
          ) : (
            <>
              <Fact
                label="Progress backed up"
                value={syncMeta?.lastSyncedAt ? ago(syncMeta.lastSyncedAt) : 'not yet'}
              />
              <Fact
                label="Account"
                value={
                  iCloudAvailable()
                    ? 'your iCloud account'
                    : identity?.provider === 'google'
                    ? 'linked with Google'
                    : identity
                      ? 'this device only'
                      : 'created on first backup'
                }
              />
              <Pressable
                style={[styles.button, syncing && styles.buttonOff]}
                accessibilityRole="button"
                accessibilityLabel="Back up now"
                disabled={syncing}
                onPress={() => void syncNow()}
              >
                {syncing ? (
                  <ActivityIndicator color={colors.card} />
                ) : (
                  <Text style={styles.buttonText}>Back up now</Text>
                )}
              </Pressable>
              {syncMessage !== null && <Text style={styles.message}>{syncMessage}</Text>}
            </>
          )}
        </View>
        <Text style={styles.note}>
          Progress backs up after each round. On iPhone and iPad it follows the same
          iCloud account automatically; Android uses the app's secure backup service.
        </Text>

        <Text style={[styles.section, styles.sectionSpaced]}>Grown-ups</Text>
        <View style={styles.panel}>
          {!tipUnlocked && tipChallenge === null && (
            <Pressable
              style={styles.button}
              accessibilityRole="button"
              accessibilityLabel="Open grown-up options"
              onPress={() => {
                setTipAnswer('');
                setTipGateError(false);
                setTipChallenge(newTipChallenge());
              }}
            >
              <Text style={styles.buttonText}>Open grown-up options</Text>
            </Pressable>
          )}
          {!tipUnlocked && tipChallenge !== null && (
            <View>
              <Text style={styles.note}>For grown-ups: what is {tipChallenge.a} × {tipChallenge.b}?</Text>
              <TextInput
                style={styles.playerName}
                accessibilityLabel="Grown-up answer"
                keyboardType="number-pad"
                value={tipAnswer}
                onChangeText={setTipAnswer}
              />
              {tipGateError && <Text style={styles.problem}>That answer is not right. Ask a grown-up to help.</Text>}
              <Pressable
                style={styles.button}
                accessibilityRole="button"
                accessibilityLabel="Continue to tips"
                onPress={() => {
                  if (Number(tipAnswer) === tipChallenge.answer && tipAnswer.trim() !== '') {
                    setTipUnlocked(true);
                    setTipChallenge(null);
                    setTipGateError(false);
                  } else {
                    setTipGateError(true);
                  }
                }}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel tip" onPress={() => setTipChallenge(null)}>
                <Text style={styles.note}>Cancel</Text>
              </Pressable>
            </View>
          )}
          {tipUnlocked && (
            <View>
              <Text style={styles.rowLabel}>Send a tip</Text>
              <Text style={styles.note}>
                Tips are optional. They do not add coins, unlock lessons, or change how the app works.
              </Text>
              {TIP_PRODUCTS.map((tip) => {
                const product = tips.products.find((item) => item.id === tip.id);
                if (!product) return null;
                return (
                  <Pressable
                    key={tip.id}
                    style={[styles.button, tips.busy && styles.buttonOff]}
                    accessibilityRole="button"
                    accessibilityLabel={`Send ${product.displayPrice} tip`}
                    disabled={tips.busy}
                    onPress={() => void tips.buy(tip.id)}
                  >
                    <Text style={styles.buttonText}>{product.displayPrice}</Text>
                  </Pressable>
                );
              })}
              {tips.products.length === 0 && (
                <Text style={styles.note}>
                  {tips.connected ? 'Tips are not available right now. Please try again later.' : 'Connecting to the store…'}
                </Text>
              )}
              {tips.busy && <ActivityIndicator accessibilityLabel="Processing tip" color={colors.primary} />}
              {tips.message !== null && <Text style={styles.message}>{tips.message}</Text>}
              <Pressable accessibilityRole="button" accessibilityLabel="Close tips" onPress={() => setTipUnlocked(false)}>
                <Text style={styles.note}>Close</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/*
          Last, and only when there is a server to send to. A button that
          opens a form and then admits it cannot post it is worse than no
          button — so on a build with no server configured, this is absent
          rather than disabled.
        */}
        {feedbackAvailable() && (
          <>
            <Text style={[styles.section, styles.sectionSpaced]}>Tell us</Text>
            <View style={styles.panel}>
              <Pressable
                style={styles.button}
                accessibilityRole="button"
                accessibilityLabel="Suggest a kind of problem"
                onPress={() => setTelling('suggestion')}
              >
                <Text style={styles.buttonText}>Suggest a kind of problem</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.buttonQuiet]}
                accessibilityRole="button"
                accessibilityLabel="Report a problem"
                onPress={() => setTelling('bug')}
              >
                <Text style={[styles.buttonText, styles.buttonQuietText]}>Report a problem</Text>
              </Pressable>
            </View>
            <Text style={styles.note}>
              Suggestions go on a list we work through. A report of something broken comes
              with your app version and device, so it can be traced without a to-and-fro.
            </Text>
          </>
        )}
      </ScrollView>

      <FeedbackSheet
        visible={telling !== null}
        kind={telling ?? 'suggestion'}
        profileId={profiles.activeId}
        gradeFor={(subject) => grades[subject]}
        onClose={() => setTelling(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20, paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 24, fontWeight: '800', color: colors.text, lineHeight: 28 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  scroll: { flex: 1 },
  content: { paddingTop: 20, paddingBottom: 24 },
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  rowOff: { opacity: 0.5 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 18, fontWeight: '800', color: colors.text },
  rowDetail: { fontSize: 14, color: colors.textMuted, marginTop: 4, lineHeight: 20 },
  note: { fontSize: 13, color: colors.textMuted, lineHeight: 19, paddingHorizontal: 4 },
  reminderPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  timeButton: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.background },
  timeButtonText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
  timeReadout: { alignItems: 'center' },
  timeLabel: { color: colors.textMuted, fontSize: 12 },
  timeValue: { color: colors.text, fontSize: 19, fontWeight: '800', marginTop: 2 },
  sectionSpaced: { marginTop: 28 },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  gradeLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  gradePills: { flexDirection: 'row', gap: 8 },
  gradePill: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradePillOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  gradePillText: { fontSize: 17, fontWeight: '800', color: colors.textMuted },
  gradePillTextOn: { color: colors.card },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  playerAvatar: { fontSize: 26, width: 34, textAlign: 'center' },
  playerName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    paddingVertical: 4,
  },
  playing: { fontSize: 12, fontWeight: '700', color: colors.primary },
  remove: { fontSize: 18, color: colors.textMuted, paddingHorizontal: 6 },
  confirm: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  confirmYes: { fontSize: 14, fontWeight: '800', color: colors.wrong ?? '#d92d20' },
  confirmNo: { fontSize: 14, fontWeight: '700', color: colors.textMuted },
  addKid: { fontSize: 15, fontWeight: '800', color: colors.primary, paddingHorizontal: 6 },
  addKidOff: { color: colors.textMuted, opacity: 0.5 },
  legalLink: { color: colors.primary, fontSize: 16, fontWeight: '700', paddingVertical: 10 },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 10,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 5,
  },
  factLabel: { fontSize: 15, color: colors.textMuted },
  factValue: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1, textAlign: 'right' },
  pending: { fontSize: 14, color: colors.text, lineHeight: 20, marginTop: 10 },
  problem: { fontSize: 13, color: colors.wrong, lineHeight: 19, marginTop: 10 },
  button: {
    marginTop: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  buttonOff: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '800', color: colors.card },
  buttonQuiet: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.border },
  buttonQuietText: { color: colors.text },
  message: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 10 },
});
