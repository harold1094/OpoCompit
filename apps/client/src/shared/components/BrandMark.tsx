import {Image, StyleSheet} from 'react-native';

export function BrandMark({size = 48}: {size?: number}) {
  return (
    <Image
      accessibilityLabel="OpoCompit"
      resizeMode="contain"
      source={require('../../../assets/brand-mark.png')}
      style={[styles.mark, {width: size, height: size}]}
    />
  );
}

const styles = StyleSheet.create({
  mark: {flexShrink: 0},
});
