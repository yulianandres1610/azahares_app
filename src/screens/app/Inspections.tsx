// Lista de Inspecciones (resumen + filtros). Versión inicial sobre datos de contenedores.
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { alpha, colors, radius } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, Card, Chip, Field, IconButton, Screen, StatusBadge } from '../../components/ui';
import { statusMeta } from '../../domain';
import { useApp } from '../../store/AppContext';
import { useNav } from '../../store/ShellNav';

type FilterKey = 'all' | 'inProgress' | 'completed';

export function Inspections() {
  const { t, containers } = useApp();
  const nav = useNav();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [q, setQ] = useState('');

  const isInProgress = (s: string) => s === 'visual_inspection' || s === 'refuel_inspection';
  const isCompleted = (s: string) => !isInProgress(s);

  const list = useMemo(
    () =>
      containers.filter((c) => {
        if (filter === 'inProgress' && !isInProgress(c.status)) return false;
        if (filter === 'completed' && !isCompleted(c.status)) return false;
        if (q && !c.number.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [containers, filter, q],
  );

  const inProgressCount = containers.filter((c) => isInProgress(c.status)).length;
  const completedCount = containers.filter((c) => isCompleted(c.status)).length;

  return (
    <Screen padBottom={108} contentStyle={{ paddingBottom: 120, paddingTop: 8 }}>
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 8 }}>
        <SummaryCard n={inProgressCount} label={t('inProgress')} color={colors.accent} active={filter === 'inProgress'} onPress={() => setFilter(filter === 'inProgress' ? 'all' : 'inProgress')} />
        <SummaryCard n={completedCount} label={t('completed')} color={colors.success} active={filter === 'completed'} onPress={() => setFilter(filter === 'completed' ? 'all' : 'completed')} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Field icon="search" placeholder={t('searchPh')} value={q} onChangeText={setQ} right={q ? <IconButton name="x" variant="plain" iconSize={16} size={32} onPress={() => setQ('')} /> : undefined} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14 }}>
        <Chip label={t('all')} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={t('inProgress')} active={filter === 'inProgress'} color={colors.accent} onPress={() => setFilter('inProgress')} />
        <Chip label={t('completed')} active={filter === 'completed'} color={colors.success} onPress={() => setFilter('completed')} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 11 }}>
        {list.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 50 }}>
            <Icon name="inspect" size={40} color={colors.ink40} />
            <AppText weight="500" style={{ color: colors.ink40, marginTop: 12 }}>
              {t('noInspections')}
            </AppText>
          </View>
        ) : (
          list.map((c) => {
            const meta = statusMeta(c.status);
            return (
              <Card key={c.id} onPress={() => nav.openOverlay({ type: 'detail', id: c.id })} pad={14}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(meta.color.startsWith('#') ? meta.color : '#3b5bbf', 0.13) }}>
                    <Icon name={meta.icon} size={22} color={meta.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText weight="700" style={{ fontSize: 15, color: colors.ink }}>
                      {c.number}
                    </AppText>
                    <AppText style={{ fontSize: 12.5, color: colors.ink50, marginTop: 2 }}>
                      {t('cycle')} {c.cycle ?? 1}
                    </AppText>
                  </View>
                  <StatusBadge status={c.status} size="sm" />
                </View>
              </Card>
            );
          })
        )}
      </View>
    </Screen>
  );
}

function SummaryCard({ n, label, color, active, onPress }: { n: number; label: string; color: string; active: boolean; onPress: () => void }) {
  return (
    <Card onPress={onPress} pad={16} style={{ flex: 1, borderWidth: active ? 1.5 : 0, borderColor: color }}>
      <AppText serif weight="700" style={{ fontSize: 30, color }}>
        {n}
      </AppText>
      <AppText weight="600" style={{ fontSize: 13, color: colors.ink60, marginTop: 2 }}>
        {label}
      </AppText>
    </Card>
  );
}
