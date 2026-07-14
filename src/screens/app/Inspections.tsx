// Inspecciones — fiel a screens-inspections.jsx (resumen + chips + track 3 pasos).
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { alpha, colors, radius, shadows } from '../../theme/tokens';
import { Icon, IconName } from '../../components/Icon';
import { AppText, Card, CheckMark, Chip, EnterUp, Field, IconButton, Screen, StatusBadge, Tap, haptic } from '../../components/ui';
import { statusMeta, stepOf } from '../../domain';
import { useApp } from '../../store/AppContext';
import { useNav } from '../../store/ShellNav';
import type { Container } from '../../lib/api/types';

const COMPLETED = ['available', 'in_transit', 'in_vessel', 'delivered'];
const PROGRESS = ['visual_inspection', 'refuel_inspection'];

function phaseOf(c: Container): 'inProgress' | 'completed' | 'other' {
  if (PROGRESS.includes(c.status)) return 'inProgress';
  if (COMPLETED.includes(c.status)) return 'completed';
  return 'other';
}

export function Inspections() {
  const { t, containers, containersLoading, refreshContainers } = useApp();
  const nav = useNav();
  const [filter, setFilter] = useState<'all' | 'inProgress' | 'completed'>('all');
  const [q, setQ] = useState('');

  const records = useMemo(() => containers.map((c) => ({ c, phase: phaseOf(c) })), [containers]);
  const list = records.filter((r) => {
    if (filter !== 'all' && r.phase !== filter) return false;
    if (q && !r.c.number.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  const nProg = records.filter((r) => r.phase === 'inProgress').length;
  const nDone = records.filter((r) => r.phase === 'completed').length;

  return (
    <Screen padBottom={108} contentStyle={{ paddingBottom: 120 }} fadeBottom fadeTop refreshing={containersLoading} onRefresh={refreshContainers}>
      {/* resumen */}
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12 }}>
        <StatCard icon="camera" color={colors.accent} n={nProg} label={t('inProgress')} active={filter === 'inProgress'} onPress={() => setFilter(filter === 'inProgress' ? 'all' : 'inProgress')} />
        <StatCard icon="checkCircle" color={colors.success} n={nDone} label={t('completed')} active={filter === 'completed'} onPress={() => setFilter(filter === 'completed' ? 'all' : 'completed')} />
      </View>

      {/* buscador */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Field icon="search" placeholder={t('searchPh')} value={q} onChangeText={setQ} right={q ? <IconButton name="x" variant="plain" iconSize={16} size={32} onPress={() => setQ('')} /> : undefined} />
      </View>

      {/* chips */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 }}>
        <Chip label={t('all')} active={filter === 'all'} count={records.length} onPress={() => setFilter('all')} />
        <Chip label={t('inProgress')} active={filter === 'inProgress'} color={colors.accent} count={nProg} onPress={() => setFilter('inProgress')} />
        <Chip label={t('completed')} active={filter === 'completed'} color={colors.success} count={nDone} onPress={() => setFilter('completed')} />
      </View>

      {/* lista */}
      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 11 }}>
        {list.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 56 }}>
            <Icon name="inspect" size={40} color={colors.ink40} />
            <AppText weight="500" style={{ fontSize: 15, color: colors.ink40, marginTop: 12 }}>
              {t('noInspections')}
            </AppText>
          </View>
        ) : (
          list.map((r, i) => (
            <EnterUp key={r.c.id} index={i}>
              <InspectionCard c={r.c} onPress={() => nav.openOverlay({ type: 'detail', id: r.c.id })} />
            </EnterUp>
          ))
        )}
      </View>
    </Screen>
  );
}

function StatCard({ icon, color, n, label, active, onPress }: { icon: IconName; color: string; n: number; label: string; active: boolean; onPress: () => void }) {
  return (
    <Tap
      onPress={() => {
        haptic('select');
        onPress();
      }}
      hapticKind={null}
      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: active ? 2 : 0, borderColor: color, ...shadows.sm }}
    >
      <View style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(color, 0.14) }}>
        <Icon name={icon} size={21} color={color} />
      </View>
      <View>
        <AppText serif weight="600" style={{ fontSize: 24, color: colors.ink, lineHeight: 26 }}>
          {n}
        </AppText>
        <AppText weight="600" style={{ fontSize: 12, color: colors.ink50, marginTop: 3 }}>
          {label}
        </AppText>
      </View>
    </Tap>
  );
}

function InspectionCard({ c, onPress }: { c: Container; onPress: () => void }) {
  const { t } = useApp();
  const meta = statusMeta(c.status);
  const step = stepOf(c);
  const done = COMPLETED.includes(c.status);

  return (
    <Card onPress={onPress} pad={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(meta.color.startsWith('#') ? meta.color : '#3b5bbf', 0.13) }}>
          <Icon name={done ? 'checkCircle' : meta.icon} size={22} color={meta.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <AppText weight="700" style={{ fontSize: 15, color: colors.ink, letterSpacing: -0.2 }}>
              {c.number}
            </AppText>
            <AppText weight="600" style={{ fontSize: 12, color: colors.ink40 }}>
              {t('cycle')} {c.cycle ?? 1}
            </AppText>
          </View>
          <AppText style={{ fontSize: 12.5, color: colors.ink50, marginTop: 2 }}>{t(c.type)}</AppText>
        </View>
        <StatusBadge status={c.status} size="sm" />
      </View>

      {/* track 3 pasos */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 13 }}>
        {[0, 1, 2].map((i) => {
          const isDone = i < step || (done && i <= 2);
          const isActive = i === step && !done;
          return (
            <React.Fragment key={i}>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isDone ? colors.success : isActive ? alpha(meta.color, 0.18) : colors.bg,
                  borderWidth: isActive ? 1.5 : 0,
                  borderColor: meta.color,
                }}
              >
                {isDone ? (
                  <CheckMark size={11} />
                ) : (
                  <View style={{ width: 5, height: 5, borderRadius: 999, backgroundColor: isActive ? meta.color : colors.ink30 }} />
                )}
              </View>
              {i < 2 && <View style={{ flex: 1, height: 3, borderRadius: 999, backgroundColor: i < step || done ? colors.success : colors.line }} />}
            </React.Fragment>
          );
        })}
        <AppText weight="600" style={{ fontSize: 11.5, color: c.status === 'visual_inspection' ? meta.color : colors.ink40, marginLeft: 4, minWidth: 30, textAlign: 'right' }}>
          {done ? '100%' : t.status(c.status).split(' ')[0]}
        </AppText>
      </View>

      {/* footer */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 }}>
        <Icon name="clock" size={13} color={colors.ink40} />
        <AppText style={{ fontSize: 11.5, color: colors.ink40 }}>
          {c.updatedAt || ''}
        </AppText>
      </View>
    </Card>
  );
}
