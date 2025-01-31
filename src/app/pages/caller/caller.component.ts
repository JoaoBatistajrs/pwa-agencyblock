import { Component, Inject, OnInit } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { Twilio } from '../../../components/twilio';

@Component({
  selector: 'app-caller',
  standalone: true,
  imports: [MatCardModule, FormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatDividerModule, MatIconModule],
  templateUrl: './caller.component.html',
  styleUrl: './caller.component.scss'
})
export class CallerComponent implements OnInit {
  readonly VAPID_PUBLIC_KEY = 'BN9seiGCuLY_kUI1bmgQa-YzQUe4-nGTC_mK6GAz2NrmVwWOySH3dwZsJkD2dWmZC8AA6hxyI7A9SHqcZAZa6oM';
  phoneNumber: string = '';
  scheduleNotificationTimeout: number = 0;
  notificationTime: number = 0;
  token: string = '';
  twilio: Twilio | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: object, private swPush: SwPush) {
    if (isPlatformBrowser(this.platformId)) {
      this.twilio = new Twilio(this.token);
    }
  }

  ngOnInit() {
    this.swPush.messages.subscribe(message => {
      console.log('Push Message:', message);
    });

    this.swPush.notificationClicks.subscribe(({ action, notification }) => {
      console.log('Notification Clicked:', notification);
      if (notification.data && notification.data.url) {
        window.open(notification.data.url, '_blank');
      }
    });
  }

  async subscribeToPush() {
    try {
      const subscription = await this.swPush.requestSubscription({
        serverPublicKey: this.VAPID_PUBLIC_KEY
      });

      console.log('Push Subscription:', subscription);

      await fetch('https://pushnotificationpi.azurewebsites.net/pushnotification/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      console.log('Subscription sent to backend successfully.');
    } catch (err) {
      console.error('Could not subscribe to notifications', err);
    }
  }

  async requestNotificationPermission() {
    const permission = await Notification.requestPermission();
    console.log('Permission:', permission);
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      await this.subscribeToPush();
    } else {
      console.log('Notification permission denied.');
    }
  }

  async scheduleNotification() {
    if (this.scheduleNotificationTimeout <= 0) {
      alert('Schedule notification timeout must be a number.');
      return;
    }

    await this.requestNotificationPermission();
    const currentTime = new Date().toLocaleTimeString();

    const payload = {
      title: 'Push notification',
      body: `This is a push notification! Current time: ${currentTime}`,
      scheduleNotificationTimeout: this.scheduleNotificationTimeout
    };
    console.log(payload);

    await fetch(
      'https://pushnotificationpi.azurewebsites.net/pushnotification/send-notification',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
  }

  makeCall() {
    if (!this.phoneNumber) {
      alert('Phone number shouldn\'t be empty.');
      return;
    }
    if (this.twilio) {
      this.twilio.makeCall(this.phoneNumber);
    } else {
      console.error('Twilio device is not initialized.');
    }
  }

  hangUp() {
    if (this.twilio) {
      this.twilio.hangUp();
    }
  }
}
