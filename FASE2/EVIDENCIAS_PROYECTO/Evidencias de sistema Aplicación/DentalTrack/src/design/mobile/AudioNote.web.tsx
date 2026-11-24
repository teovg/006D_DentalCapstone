import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Button, Notice } from "./components";
import { Dialog } from "panelui-native/components/dialog";
import { Text } from "panelui-native/primitives/text";
import type { AudioNoteProps } from "./AudioNote";
export function AudioNote({ saved, onSave, onDirty }: AudioNoteProps) {
  const input = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const [draft, setDraft] = useState(saved);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [remove, setRemove] = useState(false);
  useEffect(
    () => () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const choose = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setError("El audio supera los 20 MB. Elige uno más breve.");
      return;
    }
    if (
      !file.type.startsWith("audio/") &&
      !/\.(wav|mp3|m4a|ogg|webm)$/i.test(file.name)
    ) {
      setError("Elige un archivo de audio compatible.");
      return;
    }
    setDraft({ uri: URL.createObjectURL(file), name: file.name });
    setError("");
    onDirty();
  };
  const record = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || !globalThis.MediaRecorder)
        throw new Error(
          "Este navegador no permite grabar. Puedes adjuntar un audio.",
        );
      const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = audio;
      const chunks: BlobPart[] = [];
      const active = new MediaRecorder(audio);
      recorder.current = active;
      active.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      active.onstop = () => {
        const file = new File(
          chunks,
          `nota-de-voz-${new Date().toISOString().slice(0, 10)}.webm`,
          { type: active.mimeType || "audio/webm" },
        );
        choose(file);
        audio.getTracks().forEach((t) => t.stop());
        setRecording(false);
      };
      active.start();
      setRecording(true);
      setError("");
    } catch {
      setError(
        "No se pudo acceder al micrófono. Revisa el permiso o adjunta un audio.",
      );
    }
  };
  return (
    <View className="gap-3">
      <input
        ref={input}
        type="file"
        accept="audio/*"
        aria-label="Seleccionar audio de una atención"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) choose(file);
          e.currentTarget.value = "";
        }}
      />
      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          variant={recording ? "destructive" : "outline"}
          onPress={() => (recording ? recorder.current?.stop() : void record())}
        >
          {recording ? "Detener grabación" : "Grabar audio"}
        </Button>
        <Button
          className="flex-1"
          variant="outline"
          disabled={recording}
          onPress={() => input.current?.click()}
        >
          Adjuntar audio
        </Button>
      </View>
      {recording ? (
        <Text accessibilityLiveRegion="polite">
          Grabando. Detén la grabación para revisarla.
        </Text>
      ) : null}
      {draft ? (
        <View className="gap-3">
          <Text size="sm" weight="medium">
            {draft.name}
          </Text>
          <audio
            controls
            src={draft.uri}
            aria-label="Escuchar nota de audio"
            style={{ width: "100%", maxWidth: "100%" }}
          />
          <Button
            onPress={async () => {
              try {
                await onSave(draft);
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Guardar audio de esta atención
          </Button>
          <Button variant="ghost" onPress={() => setRemove(true)}>
            Eliminar audio
          </Button>
        </View>
      ) : (
        <Text size="sm" muted>
          Sin audio adjunto.
        </Text>
      )}
      {error ? (
        <Text className="text-destructive" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Notice>
        El audio se conserva en este dispositivo cuando lo guardas. No se sube
        ni se transcribe.
      </Notice>
      <Dialog open={remove} onOpenChange={setRemove}>
        <Dialog.Content>
          <Dialog.Title>¿Eliminar este audio?</Dialog.Title>
          <Dialog.Description>La nota escrita se conserva.</Dialog.Description>
          <Dialog.Footer>
            <Button variant="outline" onPress={() => setRemove(false)}>
              Conservar
            </Button>
            <Button
              variant="destructive"
              onPress={async () => {
                try {
                  await onSave(null);
                  if (draft?.uri.startsWith("blob:"))
                    URL.revokeObjectURL(draft.uri);
                  setDraft(null);
                  setRemove(false);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Eliminar
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog>
    </View>
  );
}
