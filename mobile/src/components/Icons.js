import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Polyline, Line, Rect } from 'react-native-svg';

// Simple line icon components - using basic shapes that work reliably
export const HomeIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  const half = size / 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Simple house shape */}
      <View style={[
        styles.rect,
        {
          width: size * 0.6,
          height: size * 0.5,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.25,
          left: size * 0.2,
        }
      ]} />
      {/* Roof */}
      <View style={[
        styles.triangle,
        {
          borderBottomWidth: size * 0.3,
          borderLeftWidth: size * 0.3,
          borderRightWidth: size * 0.3,
          borderBottomColor: color,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          top: size * 0.05,
          left: size * 0.2,
        }
      ]} />
    </View>
  );
};

export const ActivityIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.line,
        {
          width: size * 0.5,
          height: stroke,
          backgroundColor: color,
          top: size * 0.3,
          left: size * 0.25,
        }
      ]} />
      <View style={[
        styles.line,
        {
          width: size * 0.6,
          height: stroke,
          backgroundColor: color,
          top: size * 0.5,
          left: size * 0.2,
        }
      ]} />
      <View style={[
        styles.line,
        {
          width: size * 0.5,
          height: stroke,
          backgroundColor: color,
          top: size * 0.7,
          left: size * 0.25,
        }
      ]} />
    </View>
  );
};

export const ChatIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.rect,
        {
          width: size * 0.7,
          height: size * 0.55,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          borderRadius: size * 0.15,
          top: size * 0.1,
          left: size * 0.15,
        }
      ]} />
      <View style={[
        styles.circle,
        {
          width: size * 0.08,
          height: size * 0.08,
          backgroundColor: color,
          top: size * 0.3,
          left: size * 0.35,
        }
      ]} />
      <View style={[
        styles.circle,
        {
          width: size * 0.08,
          height: size * 0.08,
          backgroundColor: color,
          top: size * 0.45,
          left: size * 0.35,
        }
      ]} />
    </View>
  );
};

export const SettingsIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.circle,
        {
          width: size * 0.6,
          height: size * 0.6,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.2,
          left: size * 0.2,
        }
      ]} />
      <View style={[
        styles.circle,
        {
          width: size * 0.25,
          height: size * 0.25,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.375,
          left: size * 0.375,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: stroke,
          height: size * 0.2,
          backgroundColor: color,
          top: size * 0.05,
          left: size * 0.49,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: stroke,
          height: size * 0.2,
          backgroundColor: color,
          bottom: size * 0.05,
          left: size * 0.49,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.2,
          height: stroke,
          backgroundColor: color,
          top: size * 0.49,
          left: size * 0.05,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.2,
          height: stroke,
          backgroundColor: color,
          top: size * 0.49,
          right: size * 0.05,
        }
      ]} />
    </View>
  );
};

export const NotificationIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.rect,
        {
          width: size * 0.4,
          height: stroke,
          backgroundColor: color,
          borderRadius: stroke / 2,
          top: size * 0.15,
          left: size * 0.3,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.6,
          height: size * 0.55,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          borderRadius: size * 0.3,
          top: size * 0.2,
          left: size * 0.2,
        }
      ]} />
      <View style={[
        styles.circle,
        {
          width: size * 0.1,
          height: size * 0.1,
          backgroundColor: color,
          top: size * 0.6,
          left: size * 0.45,
        }
      ]} />
    </View>
  );
};

export const SearchIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.circle,
        {
          width: size * 0.5,
          height: size * 0.5,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.1,
          left: size * 0.1,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.3,
          height: stroke,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
          top: size * 0.55,
          left: size * 0.5,
        }
      ]} />
    </View>
  );
};

export const FilterIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.rect,
        {
          width: size * 0.7,
          height: stroke,
          backgroundColor: color,
          top: size * 0.2,
          left: size * 0.15,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.5,
          height: stroke,
          backgroundColor: color,
          top: size * 0.5,
          left: size * 0.25,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.3,
          height: stroke,
          backgroundColor: color,
          top: size * 0.8,
          left: size * 0.35,
        }
      ]} />
      <View style={[
        styles.circle,
        {
          width: size * 0.15,
          height: size * 0.15,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.15,
          left: size * 0.7,
        }
      ]} />
      <View style={[
        styles.circle,
        {
          width: size * 0.15,
          height: size * 0.15,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.45,
          left: size * 0.5,
        }
      ]} />
      <View style={[
        styles.circle,
        {
          width: size * 0.15,
          height: size * 0.15,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.75,
          left: size * 0.3,
        }
      ]} />
    </View>
  );
};

export const PlusIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.rect,
        {
          width: size * 0.6,
          height: stroke,
          backgroundColor: color,
          top: size * 0.5 - stroke / 2,
          left: size * 0.2,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: stroke,
          height: size * 0.6,
          backgroundColor: color,
          left: size * 0.5 - stroke / 2,
          top: size * 0.2,
        }
      ]} />
    </View>
  );
};

export const EyeIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );
};

export const EditIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <Path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Svg>
  );
};

export const TrashIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Polyline points="3 6 5 6 21 6" />
      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </Svg>
  );
};

export const CheckIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.rect,
        {
          width: size * 0.2,
          height: stroke,
          backgroundColor: color,
          transform: [{ rotate: '45deg' }],
          top: size * 0.5,
          left: size * 0.25,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.35,
          height: stroke,
          backgroundColor: color,
          transform: [{ rotate: '-45deg' }],
          top: size * 0.6,
          left: size * 0.35,
        }
      ]} />
    </View>
  );
};

export const ArrowLeftIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="19" y1="12" x2="5" y2="12" />
      <Polyline points="12,19 5,12 12,5" />
    </Svg>
  );
};

export const TargetIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.circle,
        {
          width: size * 0.9,
          height: size * 0.9,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.05,
          left: size * 0.05,
        }
      ]} />
      <View style={[
        styles.circle,
        {
          width: size * 0.6,
          height: size * 0.6,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.2,
          left: size * 0.2,
        }
      ]} />
      <View style={[
        styles.circle,
        {
          width: size * 0.2,
          height: size * 0.2,
          backgroundColor: color,
          top: size * 0.4,
          left: size * 0.4,
        }
      ]} />
    </View>
  );
};

export const CalendarIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </Svg>
  );
};

export const MapPinIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.rect,
        {
          width: size * 0.6,
          height: size * 0.6,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          borderRadius: size * 0.3,
          top: size * 0.1,
          left: size * 0.2,
          transform: [{ rotate: '45deg' }],
        }
      ]} />
      <View style={[
        styles.circle,
        {
          width: size * 0.25,
          height: size * 0.25,
          backgroundColor: color,
          top: size * 0.35,
          left: size * 0.375,
        }
      ]} />
    </View>
  );
};

export const LocationIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <Circle cx="12" cy="10" r="3" />
    </Svg>
  );
};

export const UsersIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <Circle cx="9" cy="7" r="4" />
      <Path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  );
};

export const ClockIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.circle,
        {
          width: size * 0.85,
          height: size * 0.85,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.075,
          left: size * 0.075,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: stroke,
          height: size * 0.25,
          backgroundColor: color,
          top: size * 0.3,
          left: size * 0.49,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.15,
          height: stroke,
          backgroundColor: color,
          top: size * 0.49,
          left: size * 0.49,
        }
      ]} />
    </View>
  );
};

export const FileIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.rect,
        {
          width: size * 0.6,
          height: size * 0.8,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.1,
          left: size * 0.2,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.4,
          height: size * 0.25,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.1,
          left: size * 0.2,
        }
      ]} />
    </View>
  );
};

export const TagIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Tag shape */}
      <View style={[
        styles.triangle,
        {
          width: size * 0.7,
          height: size * 0.7,
          borderLeftWidth: size * 0.35,
          borderRightWidth: size * 0.35,
          borderBottomWidth: size * 0.7,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderBottomColor: color,
          top: size * 0.15,
          left: size * 0.15,
          transform: [{ rotate: '45deg' }],
        }
      ]} />
      {/* Small circle */}
      <View style={[
        styles.circle,
        {
          width: size * 0.15,
          height: size * 0.15,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.42,
          left: size * 0.42,
        }
      ]} />
    </View>
  );
};

export const BuildingIcon = ({ size = 24, color = '#000000' }) => {
  const stroke = 2;
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Building base */}
      <View style={[
        styles.rect,
        {
          width: size * 0.8,
          height: size * 0.7,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.15,
          left: size * 0.1,
        }
      ]} />
      {/* Windows */}
      <View style={[
        styles.rect,
        {
          width: size * 0.1,
          height: size * 0.1,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.3,
          left: size * 0.2,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.1,
          height: size * 0.1,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.3,
          left: size * 0.5,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.1,
          height: size * 0.1,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.5,
          left: size * 0.2,
        }
      ]} />
      <View style={[
        styles.rect,
        {
          width: size * 0.1,
          height: size * 0.1,
          borderWidth: stroke,
          borderColor: color,
          backgroundColor: 'transparent',
          top: size * 0.5,
          left: size * 0.5,
        }
      ]} />
      {/* Ground line */}
      <View style={[
        styles.line,
        {
          width: size * 0.9,
          height: stroke,
          backgroundColor: color,
          top: size * 0.85,
          left: size * 0.05,
        }
      ]} />
    </View>
  );
};

export const InfoIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Circle cx="12" cy="12" r="10" />
      <Line x1="12" y1="16" x2="12" y2="12" />
      <Line x1="12" y1="8" x2="12.01" y2="8" />
    </Svg>
  );
};

export const BotIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="11" width="18" height="10" rx="2" ry="2" />
      <Circle cx="12" cy="16" r="1" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
};

export const UserIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <Circle cx="12" cy="7" r="4" />
    </Svg>
  );
};

export const MailIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <Polyline points="22,6 12,13 2,6" />
    </Svg>
  );
};

export const LockIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Svg>
  );
};

export const PhoneIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </Svg>
  );
};

export const SendIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="22" y1="2" x2="11" y2="13" />
      <Polyline points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
  );
};

export const HistoryIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <Path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </Svg>
  );
};

export const MenuIcon = ({ size = 24, color = '#000000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <Line x1="3" y1="12" x2="21" y2="12" />
      <Line x1="3" y1="6" x2="21" y2="6" />
      <Line x1="3" y1="18" x2="21" y2="18" />
    </Svg>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  line: {
    position: 'absolute',
  },
  rect: {
    position: 'absolute',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
  },
  triangle: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
  },
});
