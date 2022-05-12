import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { Authentication } from 'cloudmls/lib/src/authentication';


@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  credentials: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private alertController: AlertController,
    private router: Router,
    private loadingController: LoadingController
  ) { }

  ngOnInit() {
    this.credentials = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      retypePassword: ['', Validators.required]
    });
  }


  async register() {
    if (this.credentials.value.password != this.credentials.value.retypePassword) {
      this.alertController.create({
        header: 'Registration failed',
        message: 'Passwords don\'t match!',
        buttons: [{
          text: 'OK'
        }]
      }).then(alert => {
        alert.present()
      })
    } else {
      this.loadingController.create()
        .then(loading => loading.present()).then(_ => {
          Authentication.register(this.credentials.value)
            .then(_ => this.loadingController.dismiss()
              .then(_ => this.alertController.create({
                header: 'Registration successful!',
                buttons: [{
                  text: 'OK',
                  handler: _ => this.router.navigateByUrl('/login', { replaceUrl: true })
                }]
              }).then(alert => alert.present())))
            .catch(error => {
              console.error(error.response?.data)
              this.loadingController.dismiss()
                .then(_ =>
                  this.alertController.create({
                    header: 'Registration failed',
                    message: error.response?.data?.message,
                    buttons: [{
                      text: 'OK'
                    }]
                  }).then(alert => {
                    alert.present()
                  })
                )
            })
        })
    }
  }

}
