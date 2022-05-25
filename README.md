# Telegram Example of CloudMLS

This is an example client showing the capabilities of the [CloudMLS](https://github.com/lukaskaeppeli/CloudMLS) library.
The library can be installed via npm as well: `npm install cloudmls`. In order to use this client, one has to host a version of this [server](https://github.com/lukaskaeppeli/CloudMLS-KeyServer).


## Getting the telegram api keys
Visit the [Telegram](https://core.telegram.org/api/obtaining_api_id) website and follow the instructions to get the api_id and api_hash. Store those in the following file:

telegramexample/src/app/misc/api-keys/api-keys.ts:
```bash
export const apiKeys = {
    apiID: YOUR_API_ID, 	
    apiHash: "YOUR_API_HASH"
}
```


## Setup

### Docker
Use the "Remote - Containers" Extension from vscode.

Then (Local):
```bash
$ ionic serve --port=8100
```

or (Android)

```bash
$ ionic cordova run android
```


### Without docker

- Install nodejs (tested with v17.6.0), npm and git:

(Ubuntu)
```bash
$ sudo apt install nodejs npm git
```

- Clone this repository:

```bash
$ git clone https://github.com/lukaskaeppeli/CloudMLS-TelegramExample.git
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

- Download and install Android Studio from [here](https://developer.android.com/studio) or from your package manager and ensure that the sdk version 30 is installed. The corresponding build tools (version 30.0.3) are required too! Also ensure that the sdk is stored under Android/sdk (note the lower case s in skd).

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
$ ionic cordova run android
```


## Athena - The Telegram example

To demonstrate the capabilities of the CloudMLS library in combination
with our key server, we have created a client that is able to send and
receive end-to-end encrypted text messages through Telegram. This client
does only serve as a simple proof of concept and shows how CloudMLS
could be integrated into an existing Node.js based instant messenger.
The basis for this implementation was the Athena project from @github/noahzarro.
In this section, we are going to show how the Telegram client is
implemented and the integration of CloudMLS.

### Application overview

The Telegram example client is an Angular based web application, which
can be compiled to Android and iOS using the Ionic framework. The main
advantage of Ionic is that it allows cross-platform development using a
single code base. The project structure of our client is kept very
simple. As an entry point for the application, we use a login screen
that forwards the user to a tab overview once his login was successful.
We provide three tabs, one for an overview of the Telegram chats, one
for an overview of the contacts, and a settings page. To call the API
methods from the Telegram back-end, we use a service combining the
required logic.

### Registration and Login

The registration and login pages let a user authenticate himself to the
CloudMLS library. They are simple user interfaces with the purpose of
exposing the Authentication Service’s `register()` and `login()`
methods. Besides calling the functions from the libraries, they display
error messages resulting from these function calls.

### Telegram Service

Within the Telegram service’s page, we use two helper classes. First, we
provide a CustomLocalStorage class which provides persistent storage for
the Telegram API. This class enables saving the required keys for
authenticating a Telegram account at the Telegram API. To ensure that
only the corresponding user has access to those keys, we use the
encryption key for local content and the username hash from the CloudMLS
`KeyStore`. Second, we use a class called API for performing all calls to 
the Telegram API and handling results and errors. The Telegram service 
itself provides the following functionalities.

-   **Authentication** The authentication process with Telegram uses two
    methods, one for requesting an authentication code for the
    user-provided phone number and one for sending the authentication
    code to the Telegram API. Note that when requesting an
    authentication code, Telegram sends this code as a Telegram message
    to the user.

-   **Dialogs** To fetch and parse all dialogs, we use the method
    `getDialogs()`, which returns a list of all dialogs including a
    decrypted version of the last message sent. The method uses various
    helper functions to parse the response of the Telegram API call
    ’messages.getDialogs’.

-   **Contacts** Contacts are retrieved using a call to
    ’contacts.getContacts’, parsing the result and loading the
    corresponding profile images.

-   **Getting Messages** To load all messages from a specific dialog or
    group, the API method ’messages.getHistory’ is called. For each
    received message object, we extract the message itself, the
    corresponding sender, and the date. We then try to decrypt the
    message using the CloudMLS function decrypt of the Message service
    and set a flag, if the message was encrypted or not.

-   **Sending Messages** When sending a message, we first try to encrypt
    it using the CloudMLS function encrypt of the Message service. Note
    that the encryption can only be successful if the group or dialog
    identifier has a stored group state on the key server. We then send
    the resulting message using the API method ’messages.sendMessage’.


### Chat overview page

The chat overview page fetches the dialogs and group chats from the
Telegram service and displays them. For each of
these chats, the last message sent is decrypted such that it can be read
without opening the chat itself. We further display a blue lock on the
right-hand side, if the chat is end-to-end encrypted. In other words,
there is a blue lock if the corresponding chat has a group state on the
key server. In our example, each time when entering the chat overview
page, we call for each group and dialog the corresponding `update()` 
function. As we are not using any form of a database for the
client, this method is called to determine if the chat is E2EE or not.

### Chat page

When entering a chat, we first load all messages using the Telegram
service. Then, we try to decrypt each message and display the content.
We use three different colors to display messages. Gray indicates that a 
message is sent without being encrypted with MLS. It can therefore be 
read by any client of the corresponding third-party platform. The dark 
blue color represents messages that are sent encrypted from the current 
user. On the other side, the light blue color indicates that an encrypted 
message is sent from a chat partner.

### Contact page

After getting all contacts using the Telegram service, we check for each
contact if we can start an end-to-end encrypted conversation with it. We
achieve this by requesting and verifying the `KeyPackage` of every
contact. If the `KeyPackage` exists and is valid, we show the blue in
the list. Note that this is just a contact list and does not support the
navigation to the corresponding chat upon selection.

### Settings page

On the settings page are three functionalities incorporated. First, when
selecting the "show credentials" button, the current username and
associated accounts are displayed. Second, a user can perform a logout
which then logs the user out from the CloudMLS library and clears the
state of the Telegram service. Third, a user can connect to a Telegram
account by entering his phone number and selecting ’Request auth code’.
Telegram will then send a message containing an authentication code,
which the user then should enter in the second field in the login form.
If the authentication code is correct, the account will be connected to
the current device even when the user logs out. As we are storing the
session keys in encrypted form using the CloudMLS `KeyStore` keys, only
the authorized user has access to the session.
