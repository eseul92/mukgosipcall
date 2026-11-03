const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

// 영수증 OCR(로컬 모듈 modules/receipt-ocr)은 Google Play 서비스의 ML Kit 모델을 쓴다.
// 모델은 APK에 들어 있지 않고 기기에 따로 받아 두는 방식이라, 이 메타데이터가 없으면
// 처음 인식할 때 모델을 받느라 실패할 수 있다. 앱을 설치할 때 한국어 모델을 미리 받게 한다.
// 사진이나 인식 결과를 보내는 것이 아니라 모델 파일만 받는다.
//
// 같은 키를 expo-dev-launcher(개발 빌드의 QR 스캐너)도 'barcode_ui'로 선언한다.
// 값이 다르면 매니페스트 병합이 실패하므로, 둘을 합친 값을 앱 쪽에 두고 tools:replace로 덮는다.
const KEY = 'com.google.mlkit.vision.DEPENDENCIES';
const MODELS = ['ocr_korean'];
// 라이브러리 매니페스트가 같은 키에 넣는 값. 덮어쓰면서 빠지지 않도록 같이 넣는다.
const LIBRARY_MODELS = [{ pkg: 'expo-dev-launcher', models: ['barcode_ui'] }];

function isInstalled(pkg, projectRoot) {
  try {
    require.resolve(`${pkg}/package.json`, { paths: [projectRoot] });
    return true;
  } catch {
    return false;
  }
}

module.exports = function withMlkitKoreanModel(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = AndroidConfig.Manifest.ensureToolsAvailable(mod.modResults);
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
    const existing = (app['meta-data'] ?? []).find((item) => item.$['android:name'] === KEY);

    const values = new Set(
      (existing?.$['android:value'] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
    MODELS.forEach((model) => values.add(model));
    for (const { pkg, models } of LIBRARY_MODELS) {
      if (isInstalled(pkg, mod.modRequest.projectRoot)) models.forEach((model) => values.add(model));
    }

    AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, KEY, [...values].join(','));
    const item = app['meta-data'].find((entry) => entry.$['android:name'] === KEY);
    item.$['tools:replace'] = 'android:value';
    return mod;
  });
};
