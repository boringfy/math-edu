import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ContentStatus, UpdateOutcome, checkNow, contentStatus } from '../content';
import { Identity, loadIdentity, syncAvailable } from '../lib/identity';
import { SyncMeta, loadSyncMeta, pushNow } from '../lib/sync';
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
 * offers, rather than anything about how well it is going. Every change is
 * saved as it is made, so there is nothing to confirm on the way out.
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
  const [newName, setNewName] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Read from disk on the way in, so opening this page shows what is there
  // now rather than what was there when the app started.
  useEffect(() => setStatus(contentStatus()), []);
  useEffect(() => {
    void loadSyncMeta().then(setSyncMeta);
    void loadIdentity().then(setIdentity);
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
                onChangeText={(text) => setDraft({ ...draft, [profile.id]: text })}
                onEndEditing={() => onRenameProfile(profile.id, draft[profile.id] ?? profile.name)}
              />
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
          detail="A sheet of scrap paper above maths questions, for working an answer out by hand."
          value={settings.scratchPaper}
          onValueChange={(scratchPaper) => onChange({ ...settings, scratchPaper })}
        />
        <Row
          label="Pen only"
          detail="Only a stylus draws. A hand resting on the screen is ignored, so writing with a pen doesn't scrawl across the working."
          value={settings.penOnly}
          disabled={!settings.scratchPaper}
          onValueChange={(penOnly) => onChange({ ...settings, penOnly })}
        />
        <Text style={styles.note}>
          Turn this off on a tablet with no pen, or the paper won't take a fingertip either.
        </Text>

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
          {!syncAvailable() ? (
            <Fact label="Backup" value="off — no sync server is set for this build" />
          ) : (
            <>
              <Fact
                label="Progress backed up"
                value={syncMeta?.lastSyncedAt ? ago(syncMeta.lastSyncedAt) : 'not yet'}
              />
              <Fact
                label="Account"
                value={
                  identity?.provider === 'google'
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
          Progress backs up on its own after each round. Linking a Google account (coming
          with the next update) will carry it to a new device.
        </Text>
      </ScrollView>
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
  message: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: 10 },
});
