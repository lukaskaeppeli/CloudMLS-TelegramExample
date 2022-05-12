import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { CloudMLS } from 'cloudmls/lib/src';
import { AccountManager } from 'cloudmls/lib/src/accountManager';
import { Authentication } from 'cloudmls/lib/src/authentication';
import { Delivery } from 'cloudmls/lib/src/delivery';
import { TelegramService } from '../../services/telegram-service/telegram.service';


@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss']
})
export class Tab3Page {

  constructor(
    public telegramService: TelegramService,
    private alertController: AlertController,
    private router: Router
  ) { }


  async requestAuthCode(phone) {
    this.telegramService.requestAuthCode(phone).then(
      () => {}, // Don't care about result

      error => {
        this.alertController.create({
          header: "Error",
          subHeader: "Can't request Telegram auth code",
          message: error.message,
          buttons: ['OK']
        }).then((alertReady) => alertReady.present())
      }
    )
  }

  async sendAuth(phone, auth) {
    this.telegramService.sendAuthCode(phone, auth).then(id => {
      AccountManager.addAccount("telegram", id).then(
        () => { },
        error => {
          let msg = error.message
          if (error.message.includes("E1100")) {
            msg = "Telegram account already assigned to another user, do you have another account?"
          }
          this.alertController.create({
            header: "Error",
            subHeader: "Can't add new Telegram account",
            message: msg,
            buttons: ['OK']
          }).then((alertReady) => alertReady.present())
        }
      )
    },

      error => {
        this.alertController.create({
          header: "Error",
          subHeader: "Can't login to Telegram",
          message: error.message,
          buttons: ['OK']
        }).then((alertReady) => alertReady.present())
      })
  }

  async showCredentials() {
    let accounts = AccountManager.accounts.map(account => account.platform + ": " + account.account_id).toString()

    this.alertController.create({
      header: "Credentials",
      subHeader: "Username: " + CloudMLS.keystore.get_username(),
      message: accounts,
      buttons: ['OK']
    }).then((alertReady) => alertReady.present())
  }

  logout() {
    // Just reset the values in case that another user wants to login
    AccountManager.destroy()
    Delivery.destroy()
    this.telegramService.destroy()

    Authentication.logout(() => {
      this.router.navigateByUrl('/', { replaceUrl: true }).then(() => window.location.reload()
      )
    })
  }
}
