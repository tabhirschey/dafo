module.exports = {
  packagerConfig: {
    icon: 'DAFO',
    name: 'Duct Sizing Tool',
    executableName: 'Duct Sizing Tool'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'DuctSizingTool',
        setupExe: 'DuctSizingToolSetup.exe',
        setupIcon: 'DAFO.ico'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32']
    }
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'tabhirschey',
          name: 'Duct-Sizer---DAFO'
        },
        prerelease: false,
        draft: true
      }
    }
  ]
};