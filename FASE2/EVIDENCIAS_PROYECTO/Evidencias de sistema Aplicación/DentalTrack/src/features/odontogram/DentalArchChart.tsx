import { useId, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import type { PatientTooth } from '../../domain/teeth/types';
import { statusPresentation } from './toothPresentation';

const positions = [
  { x: 155, y: 60, rotation: -6 }, { x: 127, y: 68, rotation: -22 },
  { x: 103, y: 86, rotation: -38 }, { x: 85, y: 111, rotation: -26 },
  { x: 74, y: 143, rotation: -15 }, { x: 67, y: 177, rotation: -7 },
  { x: 63, y: 213, rotation: -3 }, { x: 62, y: 249, rotation: 0 },
];

function toothPosition(tooth: PatientTooth) {
  const source = positions[tooth.positionFromMidline - 1]!;
  const right = tooth.side === 'right';
  const upper = tooth.arch === 'maxillary';
  return {
    x: right ? source.x : 340 - source.x,
    y: upper ? source.y : 580 - source.y,
    rotation: source.rotation * (right ? 1 : -1) * (upper ? 1 : -1),
    labelX: (right ? source.x : 340 - source.x) + (right ? -1 : 1) * (tooth.positionFromMidline < 3 ? 4 : 29),
    labelY: upper ? source.y - (tooth.positionFromMidline < 3 ? 26 : 0) : 580 - source.y + (tooth.positionFromMidline < 3 ? 31 : 5),
  };
}

function Crown({ tooth, enamel }: { tooth: PatientTooth; enamel: string }) {
  const p = tooth.positionFromMidline;
  const status = statusPresentation[tooth.status];
  const marked = tooth.status !== 'healthy';
  const outline = p < 3 ? 'M-11-12Q0-16 11-12L10 8Q0 17-10 8Z' : p === 3 ? 'M-12-8Q-10-14 0-16Q10-14 12-8L10 8Q3 16 0 15Q-3 16-10 8Z' : 'M-13-9Q-10-16-3-13Q2-16 10-12Q16-7 13 1Q16 11 8 14Q0 17-9 13Q-16 10-13 2Q-17-4-13-9Z';
  return <G>
    {tooth.budgetedProcedureCount ? <Path d={outline} transform="scale(1.23)" fill="none" stroke="#7854B8" strokeWidth={2} strokeDasharray="3 2" /> : null}
    <Path d={outline} transform="translate(0 2)" fill="#9A5151" opacity={0.16} />
    <Path d={outline} fill={marked ? `${status.color}24` : `url(#${enamel})`} stroke={marked ? status.color : '#C7BBB4'} strokeWidth={marked ? 1.8 : 1} />
    <Path d={p < 3 ? 'M-8-7Q0-11 8-7M-6 8Q0 11 6 8' : 'M-8-7Q-2-10 0-3Q4-10 8-7M-8 7Q-2 10 0 3Q4 10 8 7M0-3V3M-5 0H5'} stroke={marked ? status.color : '#C9C1B9'} strokeWidth={1.2} fill="none" opacity={0.7} />
    <Path d="M-8-9Q-6-11-3-10" stroke="#FFFFFF" strokeWidth={2.5} opacity={0.9} />
    {marked ? <Path d={tooth.status === 'missing' ? 'M-5-5 5 5M5-5-5 5' : tooth.status === 'observation' || tooth.status === 'urgent' ? 'M0-6V2M0 6v.1' : 'M-5 0H5M0-5V5'} stroke={status.color} strokeWidth={3} strokeLinecap="round" /> : null}
  </G>;
}

interface DentalArchChartProps {
  teeth: readonly PatientTooth[];
  numbering: 'fdi' | 'universal';
  onSelect: (tooth: PatientTooth) => void;
  selectedId?: string;
  statusLabel?: (tooth: PatientTooth) => string;
}

export function DentalArchChart({ teeth, numbering, onSelect, selectedId, statusLabel }: DentalArchChartProps) {
  const [width, setWidth] = useState(340);
  const prefix = useId().replace(/:/g, '');
  const scale = width / 340;
  const gum = `${prefix}-gum`;
  const enamel = `${prefix}-enamel`;
  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={styles.chart}>
      <Svg width="100%" height={580 * scale} viewBox="0 0 340 580" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : { accessible: false })} fontFamily="sans-serif">
        <Defs>
          <RadialGradient id={gum} cx="50%" cy="42%" rx="60%" ry="65%"><Stop offset="0" stopColor="#FFE4DE" /><Stop offset="0.58" stopColor="#F7BCB3" /><Stop offset="1" stopColor="#DD817A" /></RadialGradient>
          <LinearGradient id={enamel} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="0.5" stopColor="#FFFDF8" /><Stop offset="1" stopColor="#DDD9D1" /></LinearGradient>
        </Defs>
        <Path d="M62 257C48 188 64 57 170 53C276 57 292 188 278 257Q268 273 253 254C270 174 242 91 170 88C98 91 70 174 87 254Q72 273 62 257Z" fill="#E5A098" opacity={0.45} />
        <Path d="M75 254C57 169 81 65 170 65C259 65 283 169 265 254Q258 274 170 270Q82 274 75 254Z" fill={`url(#${gum})`} />
        <Path d="M62 323C48 392 64 523 170 527C276 523 292 392 278 323Q268 307 253 326C270 406 242 489 170 492C98 489 70 406 87 326Q72 307 62 323Z" fill="#E5A098" opacity={0.45} />
        <Path d="M75 326C57 411 81 515 170 515C259 515 283 411 265 326Q258 306 170 310Q82 306 75 326Z" fill={`url(#${gum})`} />
        <Path d="M148 112Q156 106 165 107M192 112Q184 106 175 107M138 127Q150 116 165 121M202 127Q190 116 175 121M130 143Q147 132 165 138M210 143Q193 132 175 138" stroke="#DC8E86" fill="none" strokeWidth={1.5} opacity={0.45} />
        <Path d="M170 84V265M170 315V496M36 290H304" stroke="#DACFCC" strokeDasharray="4 5" strokeWidth={1} />
        <SvgText x={170} y={20} fontSize={12} fontWeight="600" textAnchor="middle" fill="#334155">Arcada superior</SvgText>
        <SvgText x={170} y={566} fontSize={12} fontWeight="600" textAnchor="middle" fill="#334155">Arcada inferior</SvgText>
        {[['Q1',32,48],['Q2',308,48],['Q4',32,542],['Q3',308,542]].map(([label,x,y]) => <SvgText key={label} x={Number(x)} y={Number(y)} fontSize={12} fontWeight="600" textAnchor="middle" fill="#64748B">{label}</SvgText>)}
        {teeth.map((tooth) => {
          const p = toothPosition(tooth);
          return <G key={tooth.id}>
            <G transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})`}>
              {selectedId === tooth.id ? <Path d="M-17-19H17V20H-17Z" fill="none" stroke="#0064DA" strokeWidth={2} /> : null}
              <Crown tooth={tooth} enamel={enamel} />
            </G>
            <SvgText x={p.labelX} y={p.labelY} fontSize={11} fontWeight="600" textAnchor="middle" fill="#334155">{numbering === 'fdi' ? tooth.fdi : tooth.universal}</SvgText>
          </G>;
        })}
      </Svg>
      {teeth.map((tooth) => {
        const p = toothPosition(tooth);
        return <Pressable key={tooth.id} accessibilityRole="button" accessibilityLabel={`Pieza ${numbering === 'fdi' ? tooth.fdi : tooth.universal}, ${tooth.name}, ${statusLabel?.(tooth) ?? statusPresentation[tooth.status].label}${tooth.budgetedProcedureCount ? ", con prestaciones presupuestadas" : ""}`} accessibilityState={{ selected: selectedId === tooth.id }} onPress={() => onSelect(tooth)} style={({ pressed }) => [styles.target,{left:(p.x-16)*scale,top:(p.y-17)*scale,width:32*scale,height:34*scale},pressed && styles.pressed]} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { width: '100%', maxWidth: 420, alignSelf: 'center', position: 'relative' },
  target: { position: 'absolute', borderRadius: 10 },
  pressed: { backgroundColor: 'rgba(0,100,218,0.18)' },
});
