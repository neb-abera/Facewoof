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

If it doesn't automatically format on save, you may need to set the default formatter in VS Code settings: Settings > Default formatter > Prettier. You can do this by command+shift+p or control+shift+p typing 'format document', clicking 'Format Document' and selecting the first option

*Notes*
use "npm run dev" to run the development client
use "npm run server" to run server

## Features

### Discover

The Discover feed is the perfect place for dog owners to discover potential new friends in their area, or in a locale of choice. 

To help you get started, Diggr will ask to access your location in order to show you a list of users in the mile radius you specify. 

If you're travelling soon and want to plan some social time for your pets, you can search by a specific zipcode or city to see users in that area.

Once you've specified your locale and distance preferences, Diggr will provide a list of potential matches that you can swipe right to 'Digg' or left to 'Pass'. Each profile in the list will have information available like photos, vaccination status, interests, age, and distance. Diggr will also show you profiles in a relevant order, so you see the pets and owners who have indicated interest in you first. 

Upon a successful match, you'll have the option to keep exploring or start a pack with your new friend. If you want to start a pack later, you'll be able to access your matches at any time from your friends list. 
