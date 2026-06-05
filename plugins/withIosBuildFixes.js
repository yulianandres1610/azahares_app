// Config plugin: hace reproducibles los ajustes nativos de iOS tras `expo prebuild`.
//  - ENABLE_USER_SCRIPT_SANDBOXING = NO  (evita el error "Sandbox: deny file-write-create ip.txt"
//    del script "Bundle React Native code and images" en Xcode 16+/26).
//  - DEVELOPMENT_TEAM + firma automática para no reconfigurar la firma cada vez.
const { withXcodeProject } = require('@expo/config-plugins');

const DEVELOPMENT_TEAM = '3PK78LW3QK'; // Yulian Andres (Personal Team)

module.exports = function withIosBuildFixes(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      const entry = configurations[key];
      if (!entry || typeof entry !== 'object' || !entry.buildSettings) continue;
      entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
      // Solo aplicamos team/firma al target de la app (tiene PRODUCT_BUNDLE_IDENTIFIER).
      if (entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER) {
        entry.buildSettings.DEVELOPMENT_TEAM = DEVELOPMENT_TEAM;
        entry.buildSettings.CODE_SIGN_STYLE = 'Automatic';
      }
    }
    return cfg;
  });
};
