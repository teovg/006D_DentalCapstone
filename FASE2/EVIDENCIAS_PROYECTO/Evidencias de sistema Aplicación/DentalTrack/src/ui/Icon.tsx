import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Platform } from 'react-native';
import { colors } from './theme';

export type IconName = 'home' | 'tooth' | 'calendar' | 'documents' | 'user' | 'camera' | 'search' | 'shield' | 'chevron' | 'back' | 'check' | 'info' | 'bell' | 'plus' | 'minus' | 'expand' | 'pill' | 'xray' | 'timer';

const paths: Record<Exclude<IconName, 'search' | 'user' | 'calendar' | 'camera' | 'info'>, string> = {
  home: 'M3 10.5 12 3l9 7.5M5 9v12h5v-7h4v7h5V9',
  tooth: 'M12 5c-3-2-7-2-8 2-1 4 1 6 2 10 .5 3 2 5 3 3l1-5c.4-2 3-2 3.5 0l1 5c1 2 2.5 0 3-3 1-4 3-6 2-10-1-4-5-4-8-2Zm-4 1c2 1 4 1 6 0',
  documents: 'M7 3h8l4 4v14H5V3h2Zm8 0v5h4M8 12h8M8 16h6',
  shield: 'M12 3 3 7v5c0 5 4 8 9 10 5-2 9-5 9-10V7l-9-4Zm-4 9 3 3 5-6',
  chevron: 'm9 5 7 7-7 7', back: 'm15 5-7 7 7 7', check: 'm5 12 4 4L19 6',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 21h4M12 3V2',
  pill: 'm6 18 12-12M5 19a6 6 0 0 1 0-8l6-6a6 6 0 0 1 8 8l-6 6a6 6 0 0 1-8 0Z',
  xray: 'M4 3h16v18H4V3Zm4 4 8 10m0-10L8 17',
  timer: 'M9 2h6M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3v5l3 2',
  expand: 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14',
};

export function Icon({ name, size = 24, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return (
    <Svg style={{flexShrink:0}} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false })}>
      {name === 'search' ? <><Circle cx={10.5} cy={10.5} r={6.5} /><Path d="m16 16 5 5" /></> :
        name === 'user' ? <><Circle cx={12} cy={7} r={4} /><Path d="M4 21v-2a8 8 0 0 1 16 0v2" /></> :
        name === 'calendar' ? <><Rect x={3} y={5} width={18} height={16} rx={3} /><Path d="M7 3v4m10-4v4M3 11h18M7 15h3m4 0h3m-10 3h3" /></> :
        name === 'camera' ? <><Path d="M3 7h4l2-3h6l2 3h4v14H3V7Z" /><Circle cx={12} cy={13} r={4} /></> :
        name === 'info' ? <><Circle cx={12} cy={12} r={9} /><Path d="M12 11v6m0-10v.1" /></> : <Path d={paths[name]} />}
    </Svg>
  );
}
