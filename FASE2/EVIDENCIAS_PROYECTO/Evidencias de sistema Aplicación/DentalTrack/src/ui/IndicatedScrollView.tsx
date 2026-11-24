import { useRef, useState, type RefObject } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { AppPressable } from './AppPressable';
import { Icon } from './Icon';
import { colors } from './theme';
export function IndicatedScrollView({ scrollRef, onLayout, onContentSizeChange, onScroll, ...props }: ScrollViewProps & { scrollRef?: RefObject<ScrollView | null> }) {
  const internalRef = useRef<ScrollView>(null);
  const ref = scrollRef ?? internalRef;
  const [height, setHeight] = useState(0);
  const [content, setContent] = useState(0);
  const [offset, setOffset] = useState(0);
  return <View style={{ flex: 1 }}>
    <ScrollView {...props} ref={ref} scrollEventThrottle={32}
      onLayout={(event)=>{setHeight(event.nativeEvent.layout.height);onLayout?.(event);}}
      onContentSizeChange={(width,size)=>{setContent(size);onContentSizeChange?.(width,size);}}
      onScroll={(event)=>{setOffset(event.nativeEvent.contentOffset.y);onScroll?.(event);}} />
    {content - height - offset > 16 ? <AppPressable accessibilityRole="button" accessibilityLabel="Ver más contenido abajo" onPress={()=>ref.current?.scrollTo({y:Math.min(content-height,offset+height*0.65),animated:false})} style={{position:'absolute',left:12,bottom:8,width:44,height:44,borderRadius:22,borderWidth:1,borderColor:colors.border,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'}}><View style={{transform:[{rotate:'90deg'}]}}><Icon name="chevron" color={colors.primary} size={18} /></View></AppPressable> : null}
  </View>;
}
