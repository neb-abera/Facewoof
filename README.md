# FaceWoof


1. Clone repo to your device
2. cd into FaceWoof folder
3. type "npm install" then press enter
4. Open your user settings in VS Code (on a Mac, this is Cmd-Shift-P) and click Preferences: Open Settings (JSON). You will need to add this section:

```
"[javascript]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    }
  },
```

This will let prettier format your code in accordance with the Airbnb style guide used in ESLint

*Recommend* going to VS Code settings and setting "Files: Auto Save" to "onFocusChange"

If it doesn't automatically format on save try you may need to set the default formatter in VS Code settings: Settings > Default formatter > Prettier. You can do this by command+shift+p or control+shift+p typing 'format document', clicking 'Format Document' and selecting the first option

*Notes*
use "npm run dev" to run the development client
use "npm run server" to run server
