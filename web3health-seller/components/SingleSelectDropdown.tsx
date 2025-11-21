import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
} from "react-native";
import { Colors, palette } from '@/constants/theme';

type Item = { id: number | string; displayName: string };

type Props = {
  items: Item[];
  selectedId?: number | string | null;
  onSelect: (id: number | string) => void;
  placeholder?: string;
  containerStyle?: any;
};

export default function SingleSelectDropdown({
  items,
  selectedId = null,
  onSelect,
  placeholder = "Select...",
  containerStyle,
}: Props) {
  const [open, setOpen] = useState(false);

  const selected = items.find((it) => String(it.id) === String(selectedId));

  return (
    <View style={[styles.root, containerStyle]}>
      <TouchableOpacity
        style={[styles.toggle, open && styles.toggleOpen]}
        onPress={() => setOpen((v) => !v)}
      >
        <Text style={styles.toggleText}>
          {selected ? selected.displayName : placeholder}
        </Text>
        <Text style={styles.chev}>{open ? "▴" : "▾"}</Text>
      </TouchableOpacity>

      {open && (
        <View style={styles.panel}>
          <FlatList
            data={items}
            keyExtractor={(i) => String(i.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.itemRow}
                onPress={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
              >
                <Text style={styles.itemText}>{item.displayName}</Text>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: "100%" },
  toggle: {
    borderWidth: 1,
    borderColor: palette.light.border,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleOpen: { borderColor: Colors.light.tint },
  toggleText: { color: Colors.light.text },
  chev: { color: palette.light.text.muted, marginLeft: 8 },
  panel: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: palette.light.border,
    borderRadius: 8,
    maxHeight: 240,
    backgroundColor: Colors.light.background,
  },
  itemRow: { paddingVertical: 10, paddingHorizontal: 12 },
  itemText: { fontSize: 14 },
});