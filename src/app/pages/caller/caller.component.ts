import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatButtonModule } from '@angular/material/button';
import { Twilio } from '../../../components/twilio';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

@Component({
  selector: 'app-caller',
  standalone: true,
  imports: [MatCardModule, FormsModule, MatFormFieldModule, MatInputModule, MatFormField, MatButtonModule, MatDividerModule, MatIconModule],
  templateUrl: './caller.component.html',
  styleUrl: './caller.component.scss'
})
export class CallerComponent {
  phoneNumber: string = '';
  scheduleNotificationTimeout: number = 0;
  notificationTime: number = 0;
  token: string = '';
  twilio: Twilio | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.twilio = new Twilio(this.token);
    }
  }

  updatePhoneNumber(e: Event) {
    const target = e.target as HTMLInputElement;
    this.phoneNumber = target.value;
  }

  updateNotificationTime(e: Event) {
    const target = e.target as HTMLInputElement;
    this.notificationTime = +target.value;
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

  urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
  }

  async subscribeUser() {
    if (!('serviceWorker' in navigator)) {
      console.error('Service workers are not supported by this browser.');
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    try {
      let subscription = await registration.pushManager.getSubscription();
      console.log('Log Subscription',subscription);

      if (!subscription) {
        const applicationServerKey = this.urlBase64ToUint8Array('BN9seiGCuLY_kUI1bmgQa-YzQUe4-nGTC_mK6GAz2NrmVwWOySH3dwZsJkD2dWmZC8AA6hxyI7A9SHqcZAZa6oM');
        subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        });
      }
      const response = await fetch('https://pushnotificationpi.azurewebsites.net/pushnotification/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        console.log('Subscription sent to backend successfully.');
      } else {
        console.error('Failed to send subscription to backend.');
      }
    } catch (error) {
      console.error('Failed to subscribe the user:', error);
    }
  }

  async requestNotificationPermission(){
    const permission = await Notification.requestPermission();
    console.log('permission', permission)
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          await this.subscribeUser(); // Call the updated subscribeUser function
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
    const currentTime = new Date();
    const formattedTime = currentTime.toLocaleTimeString(); // Formata a hora atual

    const payload = {
      title: 'Push notification',
      body: `This is a push notification! Current time: ${formattedTime}`,
      scheduleNotificationTimeout: this.scheduleNotificationTimeout
    };
    console.log(payload);
    await fetch(
      'https://pushnotificationpi.azurewebsites.net/pushnotification/send-notification',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );
  }

  waitSeconds(seconds = 0) {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }
}
