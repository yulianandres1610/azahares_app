// Lista de contenedores con buscador + chips de estado.
import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { alpha, colors, radius } from '../../theme/tokens';
import { Icon } from '../../components/Icon';
import { AppText, Card, Chip, Field, Header, IconButton, Progress, Screen, StatusBadge, Skeleton } from '../../components/ui';
import { TYPES, statusMeta } from '../../domain';
import { useApp } from '../../store/AppContext';
import { useNav } from '../../store/ShellNav';
import type { Container } from '../../lib/api/types';

const FILTERS = ['all', 'visual_inspection', 'refuel_inspection', 'available', 'in_transit', 'in_vessel', 'delivered', 'returning', 'maintenance'];

export function Containers() {
  const { t, containers, containersLoading, refreshContainers } = useApp();
  const nav = useNav();
  const [q, setQ] = useState('');

  const list = useMemo(
    () =>
      containers.filter((c) => {
        if (nav.filter !== 'all' && c.status !== nav.filter) return false;
        if (q && !`${c.number} ${t.status(c.status)}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [containers, nav.filter, q, t],
  );

  return (
    <Screen
      padBottom={108}
      contentStyle={{ paddingBottom: 120 }}
    >
      <Header
        title={t('containers')}
        subtitle={`${containers.length} ${t('containersLc')}`}
        right={<IconButton name="plus" variant="soft" onPress={() => nav.openOverlay({ type: 'new' })} />}
      />

      <View style={{ paddingHorizontal: 16 }}>
        <Field
          icon="search"
          placeholder={t('searchPh')}
          value={q}
          onChangeText={setQ}
          right={q ? <IconButton name="x" variant="plain" iconSize={16} size={32} onPress={() => setQ('')} /> : undefined}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 6 }}>
        <Chip label={t('all')} active={nav.filter === 'all'} count={containers.length} onPress={() => nav.setFilter('all')} />
        {FILTERS.slice(1).map((f) => {
          const n = containers.filter((c) => c.status === f).length;
          if (!n) return null;
          return <Chip key={f} label={t.status(f)} active={nav.filter === f} color={statusMeta(f).color} count={n} onPress={() => nav.setFilter(f)} />;
        })}
      </ScrollView>

      <View style={{ paddingHorizontal: 16, paddingTop: 8, gap: 11 }}>
        {containersLoading && containers.length === 0 ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} h={92} r={radius.lg} />)
        ) : list.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60 }}>
            <Icon name="box" size={40} color={colors.ink40} />
            <AppText weight="500" style={{ fontSize: 15, color: colors.ink40, marginTop: 12 }}>
              {t('noResults')}
            </AppText>
          </View>
        ) : (
          list.map((c) => <ContainerCard key={c.id} c={c} onPress={() => nav.openOverlay({ type: 'detail', id: c.id })} />)
        )}
      </View>
    </Screen>
  );
}

function Dot() {
  return <View style={{ width: 3, height: 3, borderRadius: 999, backgroundColor: colors.ink30 }} />;
}

export function ContainerCard({ c, onPress }: { c: Container; onPress: () => void }) {
  const { t } = useApp();
  const meta = statusMeta(c.status);
  const tt = TYPES[c.type] ?? { icon: 'cube' as const };
  const inspecting = c.status === 'visual_inspection' || c.status === 'refuel_inspection';
  // sin detalle de inspección en la lista, mostramos progreso aproximado
  const pct = c.status === 'visual_inspection' ? 0 : 66;

  return (
    <Card onPress={onPress} pad={14}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(meta.color.startsWith('#') ? meta.color : '#3b5bbf', 0.13),
          }}
        >
          <Icon name={tt.icon} size={24} color={meta.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText weight="700" style={{ fontSize: 15.5, color: colors.ink, letterSpacing: -0.2 }}>
            {c.number}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <AppText style={{ fontSize: 12.5, color: colors.ink50 }}>{t(c.type)}</AppText>
            {c.size ? (
              <>
                <Dot />
                <AppText style={{ fontSize: 12.5, color: colors.ink50 }}>{c.size}</AppText>
              </>
            ) : null}
            {c.capacity != null ? (
              <>
                <Dot />
                <AppText style={{ fontSize: 12.5, color: colors.ink50 }}>
                  {c.capacity.toLocaleString()} {c.unit}
                </AppText>
              </>
            ) : null}
          </View>
        </View>
        <Icon name="chevR" size={18} color={colors.ink30} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 13 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={c.status} size="sm" />
          {c.cycle != null ? (
            <View style={{ backgroundColor: alpha(colors.ink, 0.05), paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
              <AppText weight="600" style={{ color: colors.ink40, fontSize: 10 }}>
                {t('cycle')} {c.cycle}
              </AppText>
            </View>
          ) : null}
        </View>
        {inspecting && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, width: 96 }}>
            <AppText weight="600" style={{ fontSize: 11, color: meta.color }}>
              {t.status(c.status)}
            </AppText>
            <View style={{ width: 50 }}>
              <Progress value={pct} color={meta.color} height={5} />
            </View>
          </View>
        )}
      </View>
    </Card>
  );
}
