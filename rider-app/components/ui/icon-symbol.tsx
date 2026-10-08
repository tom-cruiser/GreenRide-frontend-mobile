import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
// SF Symbol names (strings) to Material Icons; newer expo-symbols types also
// allow per-platform objects, which this app never uses.
export type SymbolName = Extract<SymbolViewProps['name'], string>;
type IconMapping = Partial<Record<SymbolName, MaterialIconName>>;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING: IconMapping = {
  'house.fill': 'home',
  'car.fill': 'directions-car',
  'creditcard.fill': 'credit-card',
  'clock.fill': 'schedule',
  ellipsis: 'more-horiz',

  'paperplane.fill': 'send',
  'message.fill': 'message',
  'phone.fill': 'call',
  'envelope.fill': 'email',

  'person.fill': 'person',
  'person.circle.fill': 'account-circle',
  'person.2.fill': 'groups',

  'star.fill': 'star',
  star: 'star-border',

  'location.fill': 'location-on',
  'chart.bar.fill': 'bar-chart',
  globe: 'public',
  'paintbrush.fill': 'brush',
  'dollarsign.circle.fill': 'attach-money',
  'square.and.arrow.down.fill': 'download',
  'doc.text.fill': 'description',
  'doc.fill': 'insert-drive-file',
  'trash.fill': 'delete',
  gear: 'settings',
  'bell.fill': 'notifications',
  'shield.fill': 'shield',
  'questionmark.circle.fill': 'help',
  'gift.fill': 'card-giftcard',
  'doc.on.doc': 'content-copy',
  'lightbulb.fill': 'lightbulb',
  'exclamationmark.triangle.fill': 'warning',

  'chevron.left': 'chevron-left',
  'chevron.down': 'expand-more',
  'chevron.up': 'expand-less',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: SymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mappedName = MAPPING[name] ?? 'help-outline';
  return <MaterialIcons color={color} size={size} name={mappedName} style={style} />;
}
