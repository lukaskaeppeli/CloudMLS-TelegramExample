import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router'
import { IonContent } from '@ionic/angular';
import { TelegramService, Dialog, Message } from '../telegram.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
})


export class ChatPage implements OnInit {
  @ViewChild(IonContent, { read: IonContent, static: false }) content: IonContent;
  @ViewChild('messageContent') messageContent

  dialog: Dialog
  messages: Message[]
  ownId
  lastMessageID = ""
  hash = 0
  reloadInterval

  constructor(private router: Router, private telegramService: TelegramService) {
  }

  async ngOnInit() {
    this.dialog = this.router.getCurrentNavigation().extras.state.dialog
  }

  async ionViewDidEnter() {
    let messageResponse = await this.telegramService.getMessages(this.dialog.peer, 25, this.hash)
    let newHash = messageResponse.hash
    if (newHash != this.hash) {
      let reversedMessages = messageResponse.messages
      this.messages = reversedMessages.reverse()
      this.hash = newHash
    }
    this.scrollToBottom()
    this.reloadInterval = setInterval(this.reload, 1000, this)
  }

  ionViewDidLeave() {
    clearInterval(this.reloadInterval)
  }

  async reload(self) {
    let messageResponse = await self.telegramService.getMessages(self.dialog.peer, 25, self.hash)
    let newHash = messageResponse.hash
    if (newHash != self.hash) {
      let reversedMessages = messageResponse.messages
      self.messages = reversedMessages.reverse()
      self.hash = newHash
    }
  }

  scrollToBottom() {
    setTimeout(() => this.content.scrollToBottom(500), 0)
  }

  getColor(message: Message) {
    if (message == null) {
      return ""
    }
    if (message.isOwn) {
      if (message.encrypted) {
        return 'primary'
      }
      else {
        return 'medium'
      }
    }
    else {
      if (message.encrypted) {
        return 'secondary'
      }
      else {
        return 'medium'
      }
    }
  }

  getClasses(message: Message) {
    if (message == null) {
      return ""
    }
    let isOwn = message.isOwn ? 'ion-text-end left-pad' : 'right-pad'
    let encrypted = message.encrypted ? '' : ''
    return isOwn + ' ' + encrypted
  }


  async sendMessage(input: string | number): Promise<void> {
    let message: string = String(input)
    this.messageContent.value = ""
    let messageObject = { "message": message, "isOwn": true, encrypted: false, id: "0", from: "Me", date: 0 }
    let isEncrypted = await this.telegramService.sendMessage(this.dialog.peer, messageObject)
    messageObject.encrypted = isEncrypted
    this.messages.push(messageObject)
    this.lastMessageID = messageObject.id
    this.scrollToBottom()
  }
}
