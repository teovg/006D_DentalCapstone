import { Image, StyleSheet, View } from 'react-native';

export function SmileIllustration() {
  return (
    <View style={[styles.frame, { pointerEvents: "none" }]}>
      <Image
        source={require('../../assets/dental-smile-transparent.png')}
        resizeMode="contain"
        accessible={false}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  image: { width: '100%', height: 112 },
});
