import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { CloudMLS } from 'cloudmls/lib/src/index';
import { Authentication } from 'cloudmls/lib/src/authentication';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  credentials: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private alertController: AlertController,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.credentials = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });

    CloudMLS.sessionExpiredCallback = (message) => {
      this.toastController.create({
        message: message,
        duration: 2000
      }).then(toast => toast.present())
      this.router.navigateByUrl('/', { replaceUrl: true })
    }

    // Set the server variables of the library
    CloudMLS.servers = {
      key_server_url: environment.KEY_SERVER_URL,
      delivery_server_url: environment.DELIVERY_SERVER_URL,
      auth_server_url: environment.AUTH_SERVER_URL
    }
  }


  async login() {
    const loading = await this.loadingController.create()
    await loading.present()

    Authentication.login(this.credentials.value)
      .then(async data => {
        await loading.dismiss()
        this.router.navigateByUrl('/tabs', { replaceUrl: true });
      })
      .catch(async error => {
        await loading.dismiss()
        this.alertController.create({
          header: 'Login failed',
          message: error.response?.data?.message,
          buttons: ['OK'],
        }).then(alert => alert.present());
      })
  }

  async register() {
    this.router.navigateByUrl('/register', { replaceUrl: true });
  }
}