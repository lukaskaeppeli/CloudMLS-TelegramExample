import { Component } from '@angular/core';
import { KeyServer } from 'cloudmls/lib/src/keyserver'
import { MLSservice } from 'cloudmls/lib/src/mls-wrapper';
import { TelegramService, Peer } from 'src/app/services/telegram-service/telegram.service';

@Component({
  selector: 'app-tab2',
  templateUrl: 'tab2.page.html',
  styleUrls: ['tab2.page.scss']
})
export class Tab2Page {

  contacts: Peer[] = []

  constructor(private telegramService: TelegramService) { }


  async ionViewDidEnter() {
    this.telegramService.init().then(
      result => {
        if (result) {
          this.loadContacts()
        }
      })
  }


  async loadContacts() {
    this.telegramService.getContacts().then(
      contacts => {
        this.contacts = contacts
        this.contacts.forEach(contact => {
          KeyServer.getKeyPackage("telegram", contact.id).then(
            async keypackage => {
              if (keypackage && await MLSservice.isKeyPackageValid(keypackage)) {
                contact.hasValidKeypackage = true
              }
            })
        })
        this.contacts = this.contacts.sort((fst: Peer, snd: Peer) => {
          return fst.name > snd.name ? 1 : -1
        })
      }
    )
  }
}