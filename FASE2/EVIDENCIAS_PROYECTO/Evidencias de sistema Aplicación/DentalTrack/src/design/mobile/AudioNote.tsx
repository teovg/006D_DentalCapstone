import { Button, Notice } from "./components";
import { Text } from "panelui-native/primitives/text";
import { View } from "react-native";
export interface AudioNoteProps {
  saved: { uri: string; name: string } | null;
  onSave: (audio: { uri: string; name: string } | null) => void;
  onDirty: () => void;
}
export function AudioNote({ saved }: AudioNoteProps) {
  return (
    <View className="gap-3">
      <Text muted>{saved?.name ?? "Aún no hay audio para esta atención."}</Text>
      <Button disabled variant="outline">
        Grabar o adjuntar audio
      </Button>
      <Notice>
        La captura y reproducción nativa siguen pendientes de comprobar en
        Android. Puedes guardar la nota escrita.
      </Notice>
    </View>
  );
}
