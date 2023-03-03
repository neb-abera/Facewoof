# FaceWoof


1. Clone repo to your dev
2. cd into FaceWoof folder
3. type "npm install" then press enter
4. Open your user settings in VS Code (on a Mac, this is Cmd-Shift-P) and click Preferences: Open Settings (JSON). You will need to add this section:

"[javascript]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
}
This will let prettier format your code in accordance with the Airbnb style guide used in ESLint

*Notes*
use "npm run dev" to run the development client
use "npm run server" to run server
Create a new folder for views and components and keep componenets .jsx with their css counterpart
