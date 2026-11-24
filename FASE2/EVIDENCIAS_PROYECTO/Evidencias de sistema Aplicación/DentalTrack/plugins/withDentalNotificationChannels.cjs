const { withMainApplication } = require("expo/config-plugins");

// Configure the channel once in native startup: Expo's string sound resolver only
// accepts bundled resources, while this URI follows the phone's selected alarm.
module.exports = function withDentalNotificationChannels(config) {
  return withMainApplication(config, (mod) => {
    if (mod.modResults.language !== "kt")
      throw new Error(
        "DentalTrack requires the Kotlin MainApplication template.",
      );
    const marker = "// DentalTrack notification channels";
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents = mod.modResults.contents.replace(
        "    super.onCreate()",
        `    super.onCreate()
    ${marker}
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val manager = getSystemService(android.content.Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
      val alarms = android.app.NotificationChannel("dentaltrack-alerts-v1", "Medicamentos y temporizadores", android.app.NotificationManager.IMPORTANCE_HIGH)
      alarms.description = "Avisos que programaste en DentalTrack"
      alarms.setSound(android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM), android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_ALARM).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
      alarms.enableVibration(true)
      alarms.lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
      manager.createNotificationChannel(alarms)
      val care = android.app.NotificationChannel("dentaltrack-care-v1", "Recordatorios activos", android.app.NotificationManager.IMPORTANCE_LOW)
      care.description = "Indicaciones y próximos avisos, sin sonido al actualizarse"
      care.setSound(null, null)
      care.lockscreenVisibility = android.app.Notification.VISIBILITY_PRIVATE
      manager.createNotificationChannel(care)
    }`,
      );
    }
    return mod;
  });
};
