import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const Y_LABEL_WIDTH = 118;
const CHART_HORIZONTAL_PADDING = 32;
const BAR_AREA_WIDTH = screenWidth - CHART_HORIZONTAL_PADDING - Y_LABEL_WIDTH - 16;
const ROW_MIN_HEIGHT = 44;
const MAX_CHART_BODY_HEIGHT = 280;

const BAR_COLORS = ['#2563eb', '#8b5cf6', '#f97316', '#10b981', '#ef4444', '#f59e0b', '#06b6d4', '#ec4899'];

const getScaleMax = (values) => {
  const max = Math.max(...values, 0);
  if (max <= 0) return 10;
  if (max <= 10) return Math.ceil(max);
  if (max <= 50) return Math.ceil(max / 5) * 5;
  return Math.ceil(max / 10) * 10;
};

const formatHourTick = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return Number.isInteger(n) ? `${n}` : n.toFixed(1);
};

const TaskHoursByActivityChart = ({ data = [] }) => {
  const { rows, scaleMax, ticks } = useMemo(() => {
    const parsed = data.map((item) => ({
      title: (item.activity_title || 'Activity').trim() || 'Activity',
      hours: parseFloat(item.total_hours) || 0,
    }));
    const max = getScaleMax(parsed.map((r) => r.hours));
    const tickValues = [0, max / 2, max];
    return { rows: parsed, scaleMax: max, ticks: tickValues };
  }, [data]);

  if (rows.length === 0) return null;

  const chartBody = (
    <View style={styles.chartBody}>
      {rows.map((row, index) => {
        const barWidth = scaleMax > 0 ? (row.hours / scaleMax) * BAR_AREA_WIDTH : 0;
        return (
          <View key={`${row.title}-${index}`} style={styles.row}>
            <View style={styles.yLabelCol}>
              <Text style={styles.yLabelText} numberOfLines={2}>
                {row.title}
              </Text>
            </View>
            <View style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: Math.max(barWidth, row.hours > 0 ? 4 : 0),
                      backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                    },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{formatHourTick(row.hours)}h</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.wrapper}>
      {rows.length > 6 ? (
        <ScrollView style={{ maxHeight: MAX_CHART_BODY_HEIGHT }} nestedScrollEnabled showsVerticalScrollIndicator>
          {chartBody}
        </ScrollView>
      ) : (
        chartBody
      )}

      <View style={styles.xAxisBlock}>
        <View style={styles.xAxisSpacer} />
        <View style={styles.xAxisTicks}>
          {ticks.map((tick, i) => (
            <Text key={`tick-${i}`} style={styles.xAxisTick}>
              {formatHourTick(tick)}h
            </Text>
          ))}
        </View>
      </View>
      <View style={styles.xAxisTitleRow}>
        <View style={styles.xAxisSpacer} />
        <View style={styles.xAxisTicks}>
          <Text style={styles.xAxisTitle}>Hours</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingVertical: 8,
  },
  chartBody: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_MIN_HEIGHT,
    marginBottom: 6,
  },
  yLabelCol: {
    width: Y_LABEL_WIDTH,
    paddingRight: 8,
    justifyContent: 'center',
  },
  yLabelText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 14,
  },
  barCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: BAR_AREA_WIDTH + 40,
  },
  barTrack: {
    flex: 1,
    height: 22,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
    maxWidth: BAR_AREA_WIDTH,
  },
  barFill: {
    height: 22,
    borderRadius: 4,
  },
  barValue: {
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#2563eb',
    minWidth: 32,
  },
  xAxisBlock: {
    flexDirection: 'row',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  xAxisSpacer: {
    width: Y_LABEL_WIDTH,
  },
  xAxisTicks: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    maxWidth: BAR_AREA_WIDTH,
    paddingRight: 40,
  },
  xAxisTick: {
    fontSize: 10,
    color: '#6b7280',
  },
  xAxisTitleRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  xAxisTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
});

export default TaskHoursByActivityChart;
