import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { bytesToBase64 } from 'byte-base64';
import { CloudMLS } from 'cloudmls/lib/src/index';
import { Message } from 'cloudmls/lib/src/message'
import { Keystore } from 'cloudmls/lib/src/keystore'
import { AES, enc } from 'crypto-js';
import { apiKeys } from '../../misc/api-keys/api-keys';

const MTProto = require('@mtproto/core/envs/browser');

export type Dialog = {
  peer: Peer,
  top_message: Promise<Message>,
  encrypted: boolean,
}

export type Message = {
  message: string,
  isOwn: boolean,
  encrypted: boolean, // if the message was originally encrypted, not the current state
  id: string, // the id of the message it its respecting framework
  date: number,
  from: string, // the name of the sender of the message
}

export type Peer = {
  id: string,
  accessHash: string,
  type: string,
  name: string
  picture: Promise<string>, // base64 encoded
  members: string[],
  hasValidKeypackage?: boolean
}

/**
 * Custom local storage that stores encrypted telegram specific keys. This storage
 * stores the keys in the persistent angular storage where each entry looks as follows:
 * { username_hash: AES.encrypt(value, local_encryption_key)}
 * 
 * TODO: Using this class, one could also give the user the option of only temporarily
 * connect a device with telegram. Then the methods get and set would just make
 * use of the localStorage.getItem / localStorage.setItem
 */
class CustomLocalStorage {

  constructor(private storage: Storage, private keyStore: Keystore) {
    this.storage.create()
  }

  public get(key: string): Promise<string | null> {
    return new Promise((resolve, _) => {
      let username_hash = this.keyStore.get_username_hash()
      if (!username_hash) {
        return resolve(undefined)
      }
      this.storage.get(username_hash + "/" + key).then(
        entry => {
          let encryption_key = this.keyStore.get_local_key()
          if (!encryption_key) {
            return resolve(undefined)
          }

          if (!entry) {
            return resolve(undefined)
          }
          return resolve(AES.decrypt(entry, encryption_key).toString(enc.Utf8))
        },
        error => {
          return resolve(undefined)
        })
    })
  }

  public set(key: string, value: string): Promise<void> {
    return new Promise((resolve, _) => {
      let encryption_key = this.keyStore.get_local_key()
      if (!encryption_key) {
        return resolve(undefined)
      }
      let encrypted = AES.encrypt(value, encryption_key).toString()
      let username_hash = this.keyStore.get_username_hash()
      if (!username_hash) {
        return resolve(undefined)
      }
      return resolve(this.storage.set(username_hash + "/" + key, encrypted))
    })
  }
}

class API {
  mtproto

  constructor(private storage: Storage, private keyStore: Keystore) {
    let instance = new CustomLocalStorage(this.storage, this.keyStore)
    this.mtproto = new MTProto({
      api_id: apiKeys.apiID,
      api_hash: apiKeys.apiHash,
      storageOptions: { instance, }
    });
  }

  public async call(method, params, options = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      this.mtproto.call(method, params, options).then(
        result => {
          return resolve(result)
        },

        error => {
          console.log(`${method} error:`, error);

          const { error_code, error_message } = error;

          if (error_code === 420) {
            const seconds = Number(error_message.split('FLOOD_WAIT_')[1]);
            const ms = seconds * 1000;

            new Promise(resolve => setTimeout(resolve, ms))
              .then(() => this.call(method, params, options))
              .then(result => { return resolve(result) })

          } else if (error_code === 303) {
            const [type, dcIdAsString] = error_message.split('_MIGRATE_');

            const dcId = Number(dcIdAsString);

            // If auth.sendCode call on incorrect DC need change default DC, because
            // call auth.signIn on incorrect DC return PHONE_CODE_EXPIRED error
            if (type === 'PHONE') {
              this.mtproto.setDefaultDc(dcId)
                .then(() => this.call(method, params, options))
                .then(result => { return resolve(result) })

            } else {
              Object.assign(options, { dcId });
              this.call(method, params, options)
                .then(result => { return resolve(result) })
            }
          } else {
            return reject(error)
          }
        }
      )
    })
  }
}

@Injectable({
  providedIn: 'root'
})
export class TelegramService {

  api
  phoneCodeHash
  ownUser

  constructor(private storage: Storage) { }

  async init(): Promise<boolean> {
    if (!this.api)
      this.api = new API(this.storage, CloudMLS.keystore)

    return new Promise((resolve, _) => {
      if (this.ownUser) {
        return resolve(true)
      } else {
        this.api.call('users.getFullUser', {
          id: {
            _: 'inputUserSelf',
          },
        }).then(
          result => {
            this.ownUser = result["full_user"]
            return resolve(true)
          },
          error => {
            // No user yet
            return resolve(false)
          });
      }
    })

  }

  public destroy() {
    delete this.api
    delete this.ownUser
    delete this.phoneCodeHash
  }

  public requestAuthCode(input: string | number): Promise<void> {
    return new Promise((resolve, reject) => {
      let phoneNumber = String(input)
      this.api.call('auth.sendCode', {
        phone_number: phoneNumber, settings: {
          _: 'codeSettings',
        }
      }).then(
        result => {
          this.phoneCodeHash = result["phone_code_hash"]
          return resolve()
        },

        error => {
          return reject(error)
        })
    })

  }

  public sendAuthCode(phoneNumber: string, authCode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.api.call('auth.signIn', {
        phone_code: authCode,
        phone_number: phoneNumber,
        phone_code_hash: this.phoneCodeHash,
      }).then(
        result => {
          this.init().then(() => { return resolve(result["user"]["id"])})
        },

        error => {
          return reject(error)
        })
    })
  }

  /**
   * fetches the dialogs (conversations with corresponding peers and top messages) from telegram
   * and converts it to athena format
   * @returns an array of dialogs
   */
  public async getDialogs(): Promise<Dialog[]> {
    let telegramDialogsCollection = await this.api.call('messages.getDialogs', { limit: 500, hash: 0, offset_peer: { _: 'inputPeerEmpty' } })

    console.log("#TelegramService: dialogs loaded")

    // get reference to the api
    let self = this

    // extract important information
    let telegramUsers = telegramDialogsCollection["users"]
    let telegramChats = telegramDialogsCollection["chats"]
    let telegramDialogs = telegramDialogsCollection["dialogs"]    // 1 to 1 chats as well as group chats
    let telegramMessages = telegramDialogsCollection["messages"]  // List of last messages from each chat

    // setup return array
    let dialogs: Dialog[] = []

    // loop through all dialogs and convert them
    for (let i = 0; i < telegramDialogs.length; i++) {
      const dialog = telegramDialogs[i];

      let peer = await extractPeer(dialog)
      let groupId = this.getGroupId(peer);

      let topMessageEncrypted = this.extractMessage(telegramMessages[i], this.getOwnId())
      let [plaintext, encrypted] = await Message.decrypt(topMessageEncrypted.message, topMessageEncrypted.date * 1000, 'telegram', this.getOwnId(), groupId)

      let topMessage: Message = {
        message: plaintext,
        isOwn: topMessageEncrypted.isOwn,
        encrypted: encrypted,
        id: topMessageEncrypted.id,
        date: topMessageEncrypted.date,
        from: topMessageEncrypted.from
      }

      dialogs.push({ peer, top_message: Promise.resolve(topMessage), encrypted: false })
    }

    return dialogs

    // helper functions

    async function extractPeer(telegramDialog): Promise<Peer> {
      let type = telegramDialog["peer"]["_"]
      let telegramPeer
      let id
      let accessHash
      let name
      let picture: Promise<string>
      let members

      switch (type) {
        case "peerUser": // Chat partner
          id = telegramDialog["peer"]["user_id"].toString()
          telegramPeer = self.getUserFromList(id, telegramUsers)
          accessHash = telegramPeer["access_hash"]
          name = telegramPeer["first_name"]
          break;

        case "peerChannel": // Channel
          id = telegramDialog["peer"]["channel_id"].toString()
          telegramPeer = getChatFromList(id)
          accessHash = telegramPeer["access_hash"]
          name = telegramPeer["title"]
          break;

        case "peerChat": // Group
          id = telegramDialog["peer"]["chat_id"].toString()
          telegramPeer = getChatFromList(id)
          // chats have access_hash
          name = telegramPeer["title"]
          break;

        default:
          break;
      }

      members = await self.getGroupMembers(id, accessHash, type)

      // if photo exists, load it, otherwise use standard photo
      try {
        picture = getPhoto(id, accessHash, type, telegramPeer)
      } catch (error) {
        picture = new Promise<string>((resolve, reject) => {
          resolve('../../../assets/logo_small.png')
        })
      }

      return { id, accessHash, type, name, picture, members }
    }



    function getChatFromList(id) {
      for (let i = 0; i < telegramChats.length; i++) {
        if (telegramChats[i]['id'] == id) {
          return telegramChats[i]
        }
      }
    }

    async function getPhoto(id, accessHash, type, peer) {
      try {
        let location = { _: 'inputPeerPhotoFileLocation', big: false, peer: self.getTelegramInputPeer({ id, accessHash, type, name: "", picture: returnDefaultPicture(), members: [] }), photo_id: peer["photo"]["photo_id"] }
        let telegramPhotoObject = await self.api.call('upload.getFile', { cdn_supported: true, precise: true, location: location, offset: 0, limit: 16384 }).then(receivedPhoto => { return receivedPhoto })
        return "data:image/jpeg;base64," + bytesToBase64(telegramPhotoObject["bytes"])
      } catch (error) {
        return returnDefaultPicture()
      }
    }

    function returnDefaultPicture(): Promise<string> {
      return new Promise<string>((resolve, reject) => {
        resolve('../../../assets/logo_small.png')
      })
    }
  }

  getContacts(): Promise<Peer[]> {
    let contacts: Peer[] = []

    return new Promise((resolve, reject) => {
      this.api.call('contacts.getContacts', {}).then(
        rawContacts => {
          for (let user of rawContacts["users"]) {
            if (!user["photo"]) {
              contacts.push(defaultPhotoUser(user))

            } else {

              let inputPeer = {
                _: "inputPeerUser",
                user_id: user["id"],
                access_hash: user["access_hash"]
              }
              let location = { _: 'inputPeerPhotoFileLocation', big: false, peer: inputPeer, photo_id: user["photo"]["photo_id"] }

              let first_name = user["first_name"] ? user["first_name"] : ""
              let last_name = user["last_name"] ? user["last_name"] : ""

              contacts.push({
                id: user["id"],
                accessHash: user["access_hash"],
                type: "peerUser",
                name: `${first_name} ${last_name}`.trim(),
                picture: new Promise((resolve, _) => {
                  this.api.call('upload.getFile', { cdn_supported: true, precise: true, location: location, offset: 0, limit: 16384 }).then(
                    photo => {
                      return resolve("data:image/jpeg;base64," + bytesToBase64(photo["bytes"]))
                    },

                    error => {
                      return resolve('../../../assets/logo_small.png')
                    })
                }),
                members: []
              })
            }
          }

          return resolve(contacts)
        }
      )
    })

    function defaultPhotoUser(user) {
      let first_name = user["first_name"] ? user["first_name"] : ""
      let last_name = user["last_name"] ? user["last_name"] : ""

      return {
        id: user["id"],
        accessHash: user["access_hash"],
        type: "peerUser",
        name: `${first_name} ${last_name}`.trim(),
        picture: new Promise<string>((resolve, reject) => {
          resolve('../../../assets/logo_small.png')
        }),
        members: []
      }
    }
  }

  getUserFromList(id, users) {
    for (let i = 0; i < users.length; i++) {
      if (users[i]['id'] == id) {
        return users[i]
      }
    }
  }

  /**
   * fetches the group members from the telegram server
   * @param peer the peer to consider
   * @returns a list of the group members of the peer. Empty list if peer is a user
   */
  private async getGroupMembers(id, accessHash, type): Promise<string[]> {

    let userList: any[] = []

    switch (type) {
      case "peerUser": // Chat partner
        return new Promise<string[]>((resolve, reject) => {
          resolve([])
        })
      case "peerChat": // Group
        let fullChatInfo = await this.api.call('messages.getFullChat', { 'chat_id': id })
        userList = fullChatInfo['users']
        break;
      case "peerChannel":
        // For channels, we don't care about participants nor encryption as we can't get a participants list as non-admins.
        break;
      default:
        break;
    }

    let idList: string[] = []
    userList.forEach(user => {
      idList.push(user["id"].toString())
    });

    return idList
  }


  public async getMessages(peer: Peer, limit: number, hash: number): Promise<{ messages: Message[], hash: number }> {
    let params = { peer: this.getTelegramInputPeer(peer), limit: limit, hash: hash }
    let telegramResult = (await this.api.call('messages.getHistory', params))
    let telegramMessages: any[] = telegramResult["messages"]
    let telegramUsers: any[] = telegramResult["users"]
    let newHash = this.calculateItemHash(telegramMessages)
    if (newHash == hash) {
      return { messages: null, hash: hash }
    }

    let encryptedMessages: Message[] = telegramMessages.map((message) => {
      return {
        message: this.extractMessage(message, message["id"])["message"],
        isOwn: this.isOwnMessage(message),
        encrypted: true,
        id: message["id"],
        date: message["date"],
        from: this.getMessageSender(message, telegramUsers)
      }
    })

    let groupId = this.getGroupId(peer);


    let decryptedMessages = []

    for (let message of encryptedMessages) {
      let [plaintext, encrypted] = await Message.decrypt(message.message, message.date * 1000, 'telegram', this.getOwnId(), groupId)
      decryptedMessages.push({
        message: plaintext,
        isOwn: message.isOwn,
        encrypted: encrypted,
        id: message.id,
        date: message.date,
        from: message.from
      })
    }

    return { messages: decryptedMessages, hash: newHash }
  }

  private getGroupId(peer: Peer) {
    let groupId = peer.id;
    if (peer.type == "peerUser") {
      groupId = +this.getOwnId() < +peer.id ? this.getOwnId() + "_" + peer.id : peer.id + "_" + this.getOwnId();
    }
    return groupId;
  }

  private getMessageSender(message, users): string {
    if (message['post']) {
      return ""
    }

    let from_id
    if ('from_id' in message) {
      from_id = message["from_id"]["user_id"]
    }
    else {
      from_id = message["peer_id"]["user_id"]
    }

    let name = this.getUserFromList(from_id, users)["first_name"]
    return name
  }

  private isOwnMessage(message): boolean {
    if ('from_id' in message) {
      if (message["from_id"]["user_id"] == this.ownUser.id) {
        return true
      }
      else {
        return false
      }
    }
    return false
  }

  private calculateItemHash(items: any[]): number {
    let hash = 0
    for (const item of items) {
      hash = (((hash * 0x4F25) & 0x7FFFFFFF) + item["id"]) & 0x7FFFFFFF
    }
    return hash
  }

  public async sendMessage(peer: Peer, message: Message): Promise<boolean> {
    let groupId = this.getGroupId(peer);
    const [ciphertext, encrypted] = await Message.encrypt(message.message, 'telegram', this.getOwnId(), groupId)
    let encryptedMessage: Message = {
      message: ciphertext,
      isOwn: message.isOwn,
      encrypted: encrypted,
      id: message.id,
      date: message.date,
      from: message.from
    }
    let params = { peer: this.getTelegramInputPeer(peer), message: encryptedMessage.message, random_id: this.getRandomID() }
    await this.api.call('messages.sendMessage', params)
    return encryptedMessage.encrypted
  }

  private extractMessage(messageObject, id): Message {
    if (messageObject["_"] == "message") {
      //console.log(messageObject)
      let from = "0"
      let isOwn = true
      if (messageObject["from_id"] != undefined) {
        from = messageObject["from_id"]["user_id"]
        isOwn = from === id
      }

      return {
        message: messageObject["message"],
        isOwn: isOwn,
        encrypted: true,
        id: messageObject["id"],
        from: from,
        date: messageObject["date"]
      }
    } else if (messageObject["_"] == "messageService") {
      if (messageObject["action"]["_"] == "messageActionChatCreate") {
        return {
          message: "Chat was created",
          isOwn: false,
          encrypted: false,
          id: messageObject["id"],
          from: "",
          date: messageObject["date"]
        }
      } else if (messageObject["action"]["_"] == "messageActionChatAddUser") {
        return {
          message: "User was added",
          isOwn: false,
          encrypted: false,
          id: messageObject["id"],
          from: "",
          date: messageObject["date"]
        }
      } else if (messageObject["action"]["_"] == "messageActionChatDeleteUser") {
        return {
          message: "User was removed",
          isOwn: false,
          encrypted: false,
          id: messageObject["id"],
          from: "",
          date: messageObject["date"]
        }
      }

    }

    // Default
    return {
      message: "",
      isOwn: true,
      encrypted: true,
      id: "0",
      from: "0",
      date: 0
    }

  }

  public getOwnId() {
    return this.ownUser.id
  }


  public getTelegramInputPeer(peer: Peer) {
    let inputPeer

    if (peer.type == "peerUser") {
      inputPeer = { _: 'inputPeerUser', user_id: peer.id, access_hash: peer.accessHash }
    }
    if (peer.type == "peerChat") {
      inputPeer = { _: 'inputPeerChat', chat_id: peer.id }
    }
    if (peer.type == "peerChannel") {
      inputPeer = { _: 'inputPeerChannel', channel_id: peer.id, access_hash: peer.accessHash }
    }

    return inputPeer
  }

  getRandomID(): string {
    return (Math.ceil(Math.random() * 0xffffff) + Math.ceil(Math.random() * 0xffffff)).toString()
  }

}
