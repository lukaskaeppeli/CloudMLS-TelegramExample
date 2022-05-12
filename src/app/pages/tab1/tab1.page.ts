import { Component } from '@angular/core';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { TelegramService, Dialog } from '../../services/telegram-service/telegram.service'
import { Groups } from 'cloudmls/lib/src/groups'
import { Dialogs } from 'cloudmls/lib/src/dialogs'

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss']
})
export class Tab1Page {

  dialogs: Dialog[] = []

  constructor(
    private telegramService: TelegramService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  async ionViewDidEnter() {
    this.telegramService.init().then(
      result => {
        if (result) {
          this.loadDialogs()
        }
      })
  }

  async loadDialogs() {
    this.dialogs = await this.telegramService.getDialogs()

    for (let dialog of this.dialogs) {
      if (dialog.peer.type == "peerChat") {
        Groups.update("telegram", this.telegramService.getOwnId(), dialog.peer.id, dialog.peer.members).then(
          encrypted => {
            dialog.encrypted = encrypted
          },
          error => {
            dialog.encrypted = false
            //console.error(error)
          }
        )
      } else if (dialog.peer.type == "peerUser") {
        let account_id = this.telegramService.getOwnId()
        let peer_id = dialog.peer.id
        let groupId = +account_id < +peer_id ? account_id + "_" + peer_id : peer_id + "_" + account_id

        Dialogs.update("telegram", account_id, peer_id, groupId).then(
          encrypted => {
            dialog.encrypted = encrypted
          },
          error => {
            dialog.encrypted = false
            //console.error(error)
          }
        )
      }
    }
  }


  openChat(dialog: Dialog) {
    let id = dialog.peer.id

    let navigationExtras: NavigationExtras = {
      state: {
        dialog: dialog
      },
      relativeTo: this.route
    };
    this.router.navigate(['chat', id], navigationExtras);

  }

}
