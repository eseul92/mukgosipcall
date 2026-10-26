const { withMainApplication } = require('expo/config-plugins');

// 푸시 알림 채널 'calls'를 중요도 높음으로 만든다.
// @react-native-firebase/messaging은 채널을 만들어 주지 않고, FCM은 채널이 없으면
// 중요도가 낮은 기본 채널로 알림을 보내 화면 위에 뜨는 알림이 되지 않는다.
// 서버가 보내는 channelId('calls')와 같아야 한다 (functions/src/notifications.ts).
const CHANNEL_ID = 'calls';
const CHANNEL_NAME = '콜 알림';
const MARKER = `// ${CHANNEL_ID} 알림 채널`;

const SNIPPET = `
    ${MARKER}
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      val callsChannel = android.app.NotificationChannel(
        "${CHANNEL_ID}",
        "${CHANNEL_NAME}",
        android.app.NotificationManager.IMPORTANCE_HIGH
      )
      getSystemService(android.app.NotificationManager::class.java)
        .createNotificationChannel(callsChannel)
    }`;

module.exports = function withNotificationChannel(config) {
  return withMainApplication(config, (mod) => {
    const { language, contents } = mod.modResults;
    if (language !== 'kt') {
      throw new Error('withNotificationChannel: MainApplication이 Kotlin이 아니에요.');
    }
    if (contents.includes(MARKER)) return mod;

    const anchor = 'super.onCreate()';
    if (!contents.includes(anchor)) {
      throw new Error(`withNotificationChannel: MainApplication에서 ${anchor}를 찾지 못했어요.`);
    }
    mod.modResults.contents = contents.replace(anchor, `${anchor}${SNIPPET}`);
    return mod;
  });
};
