# Telegram Example of cloudMLS

This project shows how the npm package [cloudMLS](https://www.npmjs.org/package/cloudmls) could be integrated into a real world messenger application. In order to use this client, one has to host a version of this [server](https://github.com/lukaskaeppeli/CloudMLS-KeyServer).

## Installation

- Install nodejs (tested with v17.6.0), npm and git:

(Ubuntu)
```bash
$ sudo apt install nodejs npm git
```

- Clone this repository:

```bash
$ git clone https://github.com/lukaskaeppeli/CloudMLS-TelegramExample.git
```

## Getting the telegram api keys
Visit the [Telegram](https://core.telegram.org/api/obtaining_api_id) website and follow the instructions to get the api_id and api_hash. Store those in the following file:

telegramexample/src/app/misc/api-keys/api-keys.ts:
```bash
export const apiKeys = {
    apiID: YOUR_API_ID, 	
    apiHash: "YOUR_API_HASH"
}
```


## Host the frontend on your local machine

- Enter folder, install npm dependencies and run the application:

```bash
$ cd telegramexample
$ npm install
$ sudo npm install -g @ionic/cli
$ ionic serve --port=8100
```

- Then, open your browser and visit [http://localhost:8100](http://localhost:8100) and ensure that you have enabled cookies.


## Host the frontend on Android
In any case, if there is a problem, follow [this](https://ionicframework.com/docs/developing/android) guide, which documents the required steps very well.

- Download and install Android Studio from [https://developer.android.com/studio](developer.android.com/studio) or from your package manager and ensure that the sdk version 30 is installed. The corresponding build tools (version 30.0.3) are required too! Also ensure that the sdk is stored under Android/sdk (note the lower case s in skd).

- Install JDK 8:
```bash
$ sudo apt install openjdk-8-jdk
```

- Install Gradle:
```bash
$ sudo apt install gradle
```

- Export the Android SDK root variables:
```bash
$ export ANDROID_SDK_ROOT=$HOME/Android/sdk 
$ export ANDROID_HOME=$HOME/Android
$ export PATH=$PATH:$ANDROID_SDK_ROOT/tools/bin
$ export PATH=$PATH:$ANDROID_SDK_ROOT/platform-tools
$ export PATH=$PATH:$ANDROID_SDK_ROOT/emulator
```

- Install the project specific npm packages:
```bash 
$ cd telegramexample
$ npm install
```

- Install global npm packages:
```bash
$ sudo npm install -g native-run cordova
```

- Finally, we can deploy the application on the phone, connect the Android phone to the computer and enable debugging. Then:
```bash
$ ionic cordova serve android
```


## User interface

Login / Registration


Tab3


Tab2 


Tab1