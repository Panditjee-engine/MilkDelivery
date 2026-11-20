const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const features = manifest['uses-feature'] || [];
    const name = 'android.hardware.screen.portrait';
    const existing = features.find((f) => f.$['android:name'] === name);

    if (existing) {
      existing.$['android:required'] = 'false';
      existing.$['tools:replace'] = 'android:required';
    } else {
      features.push({
        $: {
          'android:name': name,
          'android:required': 'false',
          'tools:replace': 'android:required',
        },
      });
    }
    manifest['uses-feature'] = features;
    return cfg;
  });